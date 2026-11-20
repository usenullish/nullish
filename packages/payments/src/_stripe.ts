import Stripe from "stripe";
import { assertNonNullish, isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { envStripeSecretKey, envStripeWebhookSecret } from "@usenullish/nullish-env";
import {
  BillingPeriod,
  SubscriptionProvider,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import {
  type Payments,
  PaymentEventType,
  PaymentsSchema,
} from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { PaymentFactory } from "./_factory";
import { type PaymentEvent, PaymentProvider } from "./_payment-provider";

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

type StripePlanPrice = Stripe.Price & {
  unit_amount: number;
  recurring: Stripe.Price.Recurring;
};

@PaymentFactory
export class StripePaymentProvider extends PaymentProvider<
  Stripe.Event,
  Stripe.InvoiceCreatedEvent
> {
  readonly #stripe: Stripe;

  protected constructor() {
    super();

    this.#stripe = new Stripe(envStripeSecretKey());
  }

  static create(): StripePaymentProvider {
    return new this();
  }

  protected override async loadProduct({
    priceId,
  }: Pick<Payments["Checkout"]["Args"], "priceId">): Promise<{
    provider: SubscriptionProvider;
    externalProductId: Payments["ExternalIds"]["productId"];
  }> {
    const { product } = await this.#stripe.prices.retrieve(priceId);

    return {
      provider: SubscriptionProvider.STRIPE,
      externalProductId: this.#id(product),
    };
  }

  protected override async loadPlans({
    products,
  }: {
    products: ExternalProduct[];
  }): Promise<Payments["Plan"][]> {
    const productIds = products
      .filter(({ provider }) => provider === SubscriptionProvider.STRIPE)
      .map(({ externalProductId }) => externalProductId);

    const loadedPlans = await Promise.all(
      productIds.map((productId) => this.#loadPlan({ productId })),
    );

    return loadedPlans.filter(nonNullish);
  }

  async #loadPlan({
    productId,
  }: {
    productId: Stripe.Product["id"];
  }): Promise<Option<Payments["Plan"]>> {
    const [{ name: productName }, prices] = await Promise.all([
      this.#stripe.products.retrieve(productId),
      this.#listPrices({ productId }),
    ]);

    const isRecurringPrice = (price: Stripe.Price): price is StripePlanPrice => {
      const { unit_amount: amount, recurring } = price;
      return nonNullish(amount) && nonNullish(recurring);
    };

    // Does Stripe's interval (week, month etc.) match one of our billing periods
    const toBillingPeriod = (interval: Stripe.Price.Recurring.Interval): Option<BillingPeriod> =>
      Object.values(BillingPeriod).find((billingPeriod) => billingPeriod === interval);

    const mapPlanPrice = ({
      id: priceId,
      unit_amount: amount,
      currency,
      recurring: { interval },
    }: StripePlanPrice): Option<Payments["PlanPrice"]> => {
      const billingPeriod = toBillingPeriod(interval);

      if (isNullish(billingPeriod)) {
        return undefined;
      }

      return {
        priceId,
        amount: BigInt(amount),
        currency: currency.toUpperCase(),
        billingPeriod,
      };
    };

    const planPrices = prices.filter(isRecurringPrice).map(mapPlanPrice).filter(nonNullish);

    if (planPrices.length === 0) {
      return undefined;
    }

    return {
      productName,
      prices: planPrices,
    };
  }

  async #listPrices({
    productId,
    startingAfter,
  }: {
    productId: Stripe.Product["id"];
    startingAfter?: Stripe.Price["id"];
  }): Promise<Stripe.Price[]> {
    const { data: prices, has_more: hasMore } = await this.#stripe.prices.list({
      product: productId,
      active: true,
      type: "recurring",
      starting_after: startingAfter,
    });

    const last = prices.at(-1);

    if (!hasMore || isNullish(last)) {
      return prices;
    }

    return [...prices, ...(await this.#listPrices({ productId, startingAfter: last.id }))];
  }

  protected override async createCheckoutSession({
    organizationId,
    priceId,
    successUrl,
    cancelUrl,
    externalTaxRateId,
  }: Payments["Checkout"]["Args"] & {
    externalTaxRateId: Stripe.TaxRate["id"];
  }): Promise<Payments["Checkout"]["Result"]> {
    // https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted
    const { url } = await this.#stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        default_tax_rates: [externalTaxRateId],
        metadata: PaymentsSchema.PaymentMetadataSchema.parse({
          organizationId,
        }),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    assertNonNullish(url);

    return { url };
  }

  protected override async decode({
    payload,
    signature,
  }: Payments["Handle"]["Args"]): Promise<
    Option<PaymentEvent<Stripe.Event, Stripe.InvoiceCreatedEvent>>
  > {
    const providerEvent = await this.#stripe.webhooks.constructEventAsync(
      payload,
      signature,
      envStripeWebhookSecret(),
    );

    if (providerEvent.type === "invoice.created") {
      return { type: PaymentEventType.INVOICE, providerEvent };
    }

    return { type: PaymentEventType.PAYMENT, providerEvent };
  }

  protected override async extractDraftInvoice({
    providerEvent,
  }: {
    providerEvent: Stripe.InvoiceCreatedEvent;
  }): Promise<Option<Payments["Invoice"]>> {
    const {
      data: {
        object: { id: invoiceId, status, created, parent, default_tax_rates: taxRates },
      },
    } = providerEvent;

    const subscription = parent?.subscription_details?.subscription;

    // Only the drafts of the renewals can still be edited, the first invoice is paid at checkout.
    if (status !== "draft" || isNullish(invoiceId) || isNullish(subscription)) {
      return undefined;
    }

    return {
      provider: SubscriptionProvider.STRIPE,
      externalIds: {
        invoiceId,
        subscriptionId: this.#id(subscription),
        taxRateIds: taxRates.map(({ id }) => id),
      },
      validOn: new Date(created * 1000),
    };
  }

  protected override async updateTaxRate({
    invoice: {
      externalIds: { invoiceId, subscriptionId },
    },
    externalTaxRateId,
  }: {
    invoice: Payments["Invoice"];
    externalTaxRateId: Stripe.TaxRate["id"];
  }): Promise<void> {
    await this.#stripe.invoices.update(invoiceId, { default_tax_rates: [externalTaxRateId] });

    await this.#stripe.subscriptions.update(subscriptionId, {
      default_tax_rates: [externalTaxRateId],
    });
  }

  protected override async loadPayment({
    providerEvent,
  }: {
    providerEvent: Stripe.Event;
  }): Promise<Option<Payments["Payment"]>> {
    const subscriptionId = this.#externalSubscriptionId(providerEvent);

    if (isNullish(subscriptionId)) {
      return undefined;
    }

    const subscription = await this.#retrieveSubscription({ subscriptionId });

    const organizationId = this.#organizationId(subscription);

    if (isNullish(organizationId)) {
      return undefined;
    }

    const status = this.#mapPaymentStatus(subscription);

    if (isNullish(status)) {
      return undefined;
    }

    return {
      organizationId,
      provider: SubscriptionProvider.STRIPE,
      externalIds: this.#mapExternalIds(subscription),
      ...status,
    };
  }

  #externalSubscriptionId({ type, data }: Stripe.Event): Option<string> {
    switch (type) {
      case "checkout.session.completed": {
        const {
          object: { subscription },
        } = data;
        return isNullish(subscription) ? undefined : this.#id(subscription);
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const {
          object: { id },
        } = data;
        return id;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const {
          object: { parent },
        } = data;

        const subscription = parent?.subscription_details?.subscription;
        return isNullish(subscription) ? undefined : this.#id(subscription);
      }

      default:
        return undefined;
    }
  }

  #organizationId({
    subscription: { metadata },
  }: {
    subscription: Stripe.Subscription;
  }): Option<Payments["Payment"]["organizationId"]> {
    const result = PaymentsSchema.PaymentMetadataSchema.safeParse(metadata);

    return result.success ? result.data.organizationId : undefined;
  }

  #mapExternalIds({
    subscription: { id: subscriptionId, customer },
    item: {
      price: { product },
    },
  }: {
    subscription: Stripe.Subscription;
    item: Stripe.SubscriptionItem;
  }): Payments["ExternalIds"] {
    return {
      subscriptionId,
      customerId: this.#id(customer),
      productId: this.#id(product),
    };
  }

  #mapPaymentStatus({
    subscription: { status },
    item: { current_period_start: periodStart, current_period_end: periodEnd },
  }: {
    subscription: Stripe.Subscription;
    item: Stripe.SubscriptionItem;
  }): Option<Pick<Payments["Payment"], "status" | "periodEnd">> {
    const secondsToDate = (seconds: number): Date => {
      return new Date(seconds * 1000);
    };

    switch (status) {
      case "trialing":
        return {
          status: SubscriptionStatus.TRIALING,
          periodEnd: secondsToDate(periodEnd),
        };
      case "active":
        return {
          status: SubscriptionStatus.ACTIVE,
          periodEnd: secondsToDate(periodEnd),
        };
      case "past_due":
        return {
          status: SubscriptionStatus.PAST_DUE,
          periodEnd: secondsToDate(periodStart),
        };
      case "canceled":
      case "unpaid":
      case "paused":
      case "incomplete_expired":
        return { status: SubscriptionStatus.INACTIVE, periodEnd: undefined };
      case "incomplete":
        // The first payment is still pending and can succeed within 23 hours,
        // for example a declined card or a pending 3D Secure confirmation.
        // So the subscription stays as it is until Stripe reports the outcome.
        return undefined;
    }
  }

  // Events can arrive twice and in any order, so the current state is always read from Stripe.
  async #retrieveSubscription({
    subscriptionId,
  }: {
    subscriptionId: Stripe.Subscription["id"];
  }): Promise<{
    subscription: Stripe.Subscription;
    item: Stripe.SubscriptionItem;
  }> {
    const subscription = await this.#stripe.subscriptions.retrieve(subscriptionId);

    const [item] = subscription.items.data;
    assertNonNullish(item);

    return { subscription, item };
  }

  #id(
    value:
      | string
      | Stripe.Subscription
      | Stripe.Customer
      | Stripe.DeletedCustomer
      | Stripe.Product
      | Stripe.DeletedProduct,
  ): string {
    return typeof value === "string" ? value : value.id;
  }
}
