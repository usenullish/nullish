import Stripe from "stripe";
import { assertNonNullish, isNullish, type Option } from "@usenullish/nullish-common";
import { envStripeSecretKey, envStripeWebhookSecret } from "@usenullish/nullish-env";
import { SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import { PaymentFactory } from "./_factory";
import { PaymentProvider } from "./_payment-provider";

@PaymentFactory
export class StripePaymentProvider extends PaymentProvider {
  readonly #stripe: Stripe;

  protected constructor() {
    super();

    this.#stripe = new Stripe(envStripeSecretKey());
  }

  static create(): StripePaymentProvider {
    return new this();
  }

  protected override async resolve({
    payload,
    signature,
  }: Payments["Handle"]["Args"]): Promise<Option<Payments["Payment"]>> {
    const event = await this.#stripe.webhooks.constructEventAsync(
      payload,
      signature,
      envStripeWebhookSecret(),
    );

    const subscriptionId = this.#externalSubscriptionId(event);

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
    return metadata.organizationId;
  }

  #mapExternalIds({
    subscription: { id: subscriptionId, customer },
    item: {
      price: { product },
    },
  }: {
    subscription: Stripe.Subscription;
    item: Stripe.SubscriptionItem;
  }): Payments["PaymentExternalIds"] {
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
