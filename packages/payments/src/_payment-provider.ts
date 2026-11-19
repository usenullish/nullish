import { isNullish, type Option } from "@usenullish/nullish-common";
import {
  type ProcessPayments,
  type Payments,
  PaymentsSchema,
} from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { withDbContext } from "./_db";
import { CheckoutService } from "./services/checkout";
import { PaymentSubscriptionService } from "./services/payment-subscription";
import { PlansService } from "./services/plans";

type Claim = Records["Subscription"]["Claims"]["Select"];

type CheckoutProduct = Pick<Payments["Payment"], "provider"> & {
  externalProductId: Payments["PaymentExternalIds"]["productId"];
};

export abstract class PaymentProvider implements ProcessPayments {
  protected constructor() {}

  async listPlans(): Promise<Payments["Plan"][]> {
    // 1. Load the claims that are linked with a product
    const result = await withDbContext(async (dbContext) => {
      return await PlansService.create({
        db: dbContext,
      }).listClaims();
    });

    if (result.status === "error") {
      throw result.err;
    }

    // 2. Load the plans of those products with the provider ("from Stripe")
    const plans = await this.loadPlans({ claims: result.result });

    return PaymentsSchema.PaymentPlansSchema.parse(plans);
  }

  async checkout(args: Payments["Checkout"]["Args"]): Promise<Payments["Checkout"]["Result"]> {
    const parsedArgs = PaymentsSchema.CheckoutPaymentsArgsSchema.parse(args);

    const { userId, organizationId, priceId } = parsedArgs;

    // 1. Load product at the provider ("from Stripe")
    const product = await this.loadProduct({ priceId });

    // 2. Assert user own the org, claim is related to this product and has never been used (referenced)
    const result = await withDbContext(async (dbContext) => {
      return await CheckoutService.create({
        db: dbContext,
      }).assert({ userId, organizationId, ...product });
    });

    if (result.status === "error") {
      throw result.err;
    }

    // 3. Create the checkout with the provider ("in Stripe")
    const checkout = await this.createCheckoutSession(parsedArgs);

    return PaymentsSchema.PaymentCheckoutSchema.parse(checkout);
  }

  async handle(args: Payments["Handle"]["Args"]): Promise<Option<Payments["Payment"]>> {
    const parsedArgs = PaymentsSchema.HandlePaymentsArgsSchema.parse(args);

    // 1. Decode, assert and load the data potentially triggered by the provider ("webhook called by Stripe")
    const resolved = await this.resolve(parsedArgs);

    if (isNullish(resolved)) {
      return undefined;
    }

    const payment = PaymentsSchema.PaymentSchema.parse(resolved);

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

  protected abstract loadProduct(
    args: Pick<Payments["Checkout"]["Args"], "priceId">,
  ): Promise<CheckoutProduct>;

  protected abstract loadPlans(args: { claims: Claim[] }): Promise<Payments["Plan"][]>;

  protected abstract createCheckoutSession(
    args: Payments["Checkout"]["Args"],
  ): Promise<Payments["Checkout"]["Result"]>;

  protected abstract resolve(
    args: Payments["Handle"]["Args"],
  ): Promise<Option<Payments["Payment"]>>;
}
