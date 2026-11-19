import { isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import { type Tx } from "@usenullish/nullish-db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { getClaimByExternalProduct } from "./_helpers/claims";
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

    const subscription = await getExistingSubscription({
      tx,
      organizationId,
      lock: "update",
    });

    const reference = await getSubscriptionReference({
      tx,
      subscriptionId: subscription.id,
    });

    if (nonNullish(reference)) {
      this.#assertSameExternalSubscription({ reference, payment });
    }

    if (isNullish(reference)) {
      await insertSubscriptionReference({
        tx,
        subscriptionId: subscription.id,
        provider,
        externalIds,
      });
    }

    return await this.#apply({ tx, subscription, payment });
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

  async #apply({
    tx,
    subscription,
    payment: { provider, externalIds, status, periodEnd },
  }: {
    tx: Tx;
    subscription: Subscription;
    payment: Payment;
  }): Promise<Subscription> {
    const { id: claimId } = await getClaimByExternalProduct({
      tx,
      provider,
      externalProductId: externalIds.productId,
    });

    return await updateSubscription({
      tx,
      subscription,
      claimId,
      status,
      periodEnd,
    });
  }
}
