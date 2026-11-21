import { isArrayExactlyOne, isNullish, type Option } from "@usenullish/nullish-common";
import {
  PaymentEventType,
  type ProcessPayments,
  type Payments,
  PaymentsSchema,
} from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  SUBSCRIPTION_BILLING_PARAM,
  SUBSCRIPTION_DETAILS_PATH,
  SUBSCRIPTION_PLANS_PATH,
  SUBSCRIPTION_SUCCESS_PATH,
} from "@usenullish/nullish-schema/server";
import { envAppUrl } from "@usenullish/nullish-env";
import { withDbContext } from "./_db";
import { CheckoutService } from "./services/checkout";
import { ManageService } from "./services/manage";
import { PaymentInvoiceService } from "./services/payment-invoice";
import { PaymentSubscriptionService } from "./services/payment-subscription";
import { ExternalProductsService } from "./services/external-products";

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];
type ExternalTaxRateId =
  Records["Subscription"]["SubscriptionTaxRates"]["Select"]["externalTaxRateId"];

export type PortalSessionArgs = Pick<
  Records["Subscription"]["SubscriptionReferences"]["Select"],
  "externalCustomerId"
> & {
  returnUrl: Payments["Manage"]["Result"]["url"];
};

export type CheckoutSessionArgs = Pick<
  Payments["Checkout"]["Args"],
  "organizationId" | "priceId"
> & {
  successUrl: Payments["Checkout"]["Result"]["url"];
  cancelUrl: Payments["Checkout"]["Result"]["url"];
  externalTaxRateId: ExternalTaxRateId;
};

type CheckoutProduct = Pick<Payments["Payment"], "provider"> & {
  externalProductId: Payments["ExternalIds"]["productId"];
};

export type PaymentEvent<ProviderPaymentEvent, ProviderInvoiceEvent> =
  | { type: PaymentEventType.PAYMENT; providerEvent: ProviderPaymentEvent }
  | { type: PaymentEventType.INVOICE; providerEvent: ProviderInvoiceEvent };

export abstract class PaymentProvider<
  ProviderPaymentEvent,
  ProviderInvoiceEvent,
> implements ProcessPayments {
  protected constructor() {}

  async listPlans(): Promise<Payments["Plan"][]> {
    // 1. Load the products linked with a plan
    const result = await withDbContext(async (dbContext) => {
      return await ExternalProductsService.create({
        db: dbContext,
      }).list();
    });

    if (result.status === "error") {
      throw result.err;
    }

    // 2. Load the plans of those products with the provider ("from Stripe")
    const plans = await this.loadPlans({ products: result.result });

    return PaymentsSchema.PaymentPlansSchema.parse(plans);
  }

  async checkout(args: Payments["Checkout"]["Args"]): Promise<Payments["Checkout"]["Result"]> {
    const parsedArgs = PaymentsSchema.CheckoutPaymentsArgsSchema.parse(args);

    const { userId, organizationId, priceId, billingPeriod } = parsedArgs;

    // 1. Load product at the provider ("from Stripe")
    const product = await this.loadProduct({ priceId });

    // 2. Assert user own the org, plan is related to this product and has never been used (referenced)
    // and load the tax rate valid today
    const result = await withDbContext(async (dbContext) => {
      return await CheckoutService.create({
        db: dbContext,
      }).prepare({ userId, organizationId, ...product, validOn: new Date() });
    });

    if (result.status === "error") {
      throw result.err;
    }

    const {
      result: { externalTaxRateId },
    } = result;

    // 3. Create the checkout with the provider ("in Stripe")
    const checkout = await this.createCheckoutSession({
      organizationId,
      priceId,
      ...this.#checkoutUrls({ organizationId, billingPeriod }),
      externalTaxRateId,
    });

    return PaymentsSchema.PaymentCheckoutSchema.parse(checkout);
  }

  #checkoutUrls({
    organizationId,
    billingPeriod,
  }: Pick<Payments["Checkout"]["Args"], "organizationId" | "billingPeriod">): Pick<
    CheckoutSessionArgs,
    "successUrl" | "cancelUrl"
  > {
    const organizationUrl = `${envAppUrl()}/orgs/${organizationId}`;

    const cancelUrl = new URL(`${organizationUrl}${SUBSCRIPTION_PLANS_PATH}`);
    cancelUrl.searchParams.set(SUBSCRIPTION_BILLING_PARAM, billingPeriod);

    return {
      successUrl: `${organizationUrl}${SUBSCRIPTION_SUCCESS_PATH}`,
      cancelUrl: cancelUrl.toString(),
    };
  }

  async manage(args: Payments["Manage"]["Args"]): Promise<Payments["Manage"]["Result"]> {
    const { userId, organizationId } = PaymentsSchema.ManagePaymentsArgsSchema.parse(args);

    // 1. Assert the user is an admin of the organization and load its customer at the provider
    const result = await withDbContext(async (dbContext) => {
      return await ManageService.create({
        db: dbContext,
      }).prepare({ userId, organizationId });
    });

    if (result.status === "error") {
      throw result.err;
    }

    const {
      result: { externalCustomerId },
    } = result;

    // 2. Create the portal session of the customer with the provider ("in Stripe")
    const portal = await this.createPortalSession({
      externalCustomerId,
      returnUrl: `${envAppUrl()}/orgs/${organizationId}${SUBSCRIPTION_DETAILS_PATH}`,
    });

    return PaymentsSchema.PaymentManageSchema.parse(portal);
  }

  async handle(args: Payments["Handle"]["Args"]): Promise<Option<Payments["Payment"]>> {
    const parsedArgs = PaymentsSchema.HandlePaymentsArgsSchema.parse(args);

    // Verify and decode the event triggered by the provider ("webhook called by Stripe")
    const decoded = await this.decode(parsedArgs);

    switch (decoded?.type) {
      case PaymentEventType.PAYMENT:
        return await this.#handlePayment(decoded);
      case PaymentEventType.INVOICE:
        await this.#handleInvoice(decoded);
        return undefined;
      default:
        return undefined;
    }
  }

  async #handlePayment({
    providerEvent,
  }: {
    providerEvent: ProviderPaymentEvent;
  }): Promise<Option<Payments["Payment"]>> {
    // 1. Assert and load the payment of the event
    const loaded = await this.loadPayment({ providerEvent });

    if (isNullish(loaded)) {
      return undefined;
    }

    const payment = PaymentsSchema.PaymentSchema.parse(loaded);

    // 2. Update subscription and if first payment insert the reference
    const result = await withDbContext(async (dbContext) => {
      return await PaymentSubscriptionService.create({
        db: dbContext,
      }).sync({ payment });
    });

    if (result.status === "error") {
      throw result.err;
    }

    return payment;
  }

  async #handleInvoice({ providerEvent }: { providerEvent: ProviderInvoiceEvent }): Promise<void> {
    // 1. Extract the draft invoice of the event
    const extracted = await this.extractDraftInvoice({ providerEvent });

    if (isNullish(extracted)) {
      return;
    }

    const invoice = PaymentsSchema.PaymentInvoiceSchema.parse(extracted);

    // 2. Load the tax rate valid on the date of the invoice
    const result = await withDbContext(async (dbContext) => {
      return await PaymentInvoiceService.create({
        db: dbContext,
      }).prepare({ provider: invoice.provider, validOn: invoice.validOn });
    });

    if (result.status === "error") {
      throw result.err;
    }

    const {
      result: { externalTaxRateId },
    } = result;

    // 3. Nothing to update if the invoice already has the tax rate valid on its date
    if (this.#isTaxRateUpToDate({ invoice, externalTaxRateId })) {
      return;
    }

    // 4. Update the tax rate of the invoice and the subscription with the provider ("in Stripe")
    await this.updateTaxRate({ invoice, externalTaxRateId });
  }

  #isTaxRateUpToDate({
    invoice: {
      externalIds: { invoiceId, taxRateIds },
    },
    externalTaxRateId,
  }: {
    invoice: Payments["Invoice"];
    externalTaxRateId: ExternalTaxRateId;
  }): boolean {
    if (!isArrayExactlyOne(taxRateIds)) {
      throw new Error(
        `Invoice ${invoiceId} should have exactly one tax rate, it has ${taxRateIds.length}.`,
      );
    }

    const [taxRateId] = taxRateIds;
    return taxRateId === externalTaxRateId;
  }

  protected abstract loadProduct(
    args: Pick<Payments["Checkout"]["Args"], "priceId">,
  ): Promise<CheckoutProduct>;

  protected abstract loadPlans(args: { products: ExternalProduct[] }): Promise<Payments["Plan"][]>;

  protected abstract createCheckoutSession(
    args: CheckoutSessionArgs,
  ): Promise<Payments["Checkout"]["Result"]>;

  protected abstract createPortalSession(
    args: PortalSessionArgs,
  ): Promise<Payments["Manage"]["Result"]>;

  protected abstract decode(
    args: Payments["Handle"]["Args"],
  ): Promise<Option<PaymentEvent<ProviderPaymentEvent, ProviderInvoiceEvent>>>;

  protected abstract loadPayment(args: {
    providerEvent: ProviderPaymentEvent;
  }): Promise<Option<Payments["Payment"]>>;

  protected abstract extractDraftInvoice(args: {
    providerEvent: ProviderInvoiceEvent;
  }): Promise<Option<Payments["Invoice"]>>;

  protected abstract updateTaxRate(args: {
    invoice: Payments["Invoice"];
    externalTaxRateId: ExternalTaxRateId;
  }): Promise<void>;
}
