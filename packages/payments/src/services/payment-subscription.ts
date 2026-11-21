import { isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import { type Tx } from "@usenullish/nullish-db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { getExternalProduct } from "./_helpers/external-products";
import {
  getSubscriptionReference,
  insertSubscriptionReference,
} from "./_helpers/subscription-references";
import { getExistingSubscription, updateSubscription } from "./_helpers/subscriptions";
import { AdminServiceContext } from "./_admin-service";
import type { AdminServiceContextArgs } from "../../../admin/src/_service";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];
type Payment = Payments["Payment"];

export class PaymentSubscriptionService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PaymentSubscriptionService {
    return new this(args);
  }

  sync({ payment }: { payment: Payment }): Promise<Result<Subscription>> {
    return this._withDbContext(async (tx) => {
      return await this.#link({ tx, payment });
    });
  }

  async #link({ tx, payment }: { tx: Tx; payment: Payment }): Promise<Subscription> {
    const { organizationId, provider, externalIds } = payment;

    // 1. Get and lock the existing subscription
    const subscription = await getExistingSubscription({
      tx,
      organizationId,
      lock: "update",
    });

    // 2. Find the related subscription reference
    const reference = await getSubscriptionReference({
      tx,
      subscriptionId: subscription.id,
    });

    // 3. If the reference exists ensure it is related to the received payment
    if (nonNullish(reference)) {
      this.#assertSameExternalSubscription({ reference, payment });
    }

    // 4. If the reference does not exist yes - first time user is paying - create it
    if (isNullish(reference)) {
      await insertSubscriptionReference({
        tx,
        subscriptionId: subscription.id,
        provider,
        externalIds,
      });
    }

    // 5. Get the plan configured for the product
    const { planId } = await getExternalProduct({
      tx,
      provider,
      externalProductId: externalIds.productId,
    });

    const { status, periodEnd, cancelAt } = payment;

    // 6. Update the subscription with the plan (new or same), period end, cancellation and status
    return await updateSubscription({
      tx,
      subscription,
      planId,
      status,
      periodEnd,
      cancelAt,
    });
  }

  #assertSameExternalSubscription({
    reference,
    payment: { provider, externalIds },
  }: {
    reference: SubscriptionReference;
    payment: Payment;
  }): void {
    if (
      reference.provider !== provider ||
      reference.externalSubscriptionId !== externalIds.subscriptionId
    ) {
      throw new Error(
        `Subscription ${reference.subscriptionId} is linked to another external subscription.`,
      );
    }
  }
}
