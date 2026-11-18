import {
  isNullish,
  nonNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { DbAdminContext, type Tx } from "@usenullish/nullish-db";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { getClaimByExternalProduct } from "./_helpers/claims";
import {
  getReferencedOrganizationId,
  getSubscriptionReference,
  insertSubscriptionReference,
} from "./_helpers/subscription-references";
import { getAndLockExistingSubscription, updateSubscription } from "./_helpers/subscriptions";
import { withDbContext } from "../_db";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];
type Payment = Payments["Payment"];

export class PaymentSubscriptionService {
  readonly #db: DbAdminContext;

  private constructor({ db }: { db: DbAdminContext }) {
    this.#db = db;
  }

  static create(args: { db: DbAdminContext }): PaymentSubscriptionService {
    return new this(args);
  }

  sync({ payment }: { payment: Payment }): Promise<Result<Option<Subscription>>> {
    return tryCatch(async () => {
      return await this.#db.exec(async (tx) => {
        const { organizationId } = payment;

        return nonNullish(organizationId)
          ? await this.#link({ tx, organizationId, payment })
          : await this.#update({ tx, payment });
      });
    });
  }

  async #link({
    tx,
    organizationId,
    payment,
  }: {
    tx: Tx;
    organizationId: Subscription["organizationId"];
    payment: Payment;
  }): Promise<Subscription> {
    const { provider, externalIds } = payment;

    const subscription = await getAndLockExistingSubscription({
      tx,
      organizationId,
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

  async #update({ tx, payment }: { tx: Tx; payment: Payment }): Promise<Option<Subscription>> {
    const { provider, externalIds } = payment;

    const organizationId = await getReferencedOrganizationId({
      tx,
      provider,
      externalSubscriptionId: externalIds.subscriptionId,
    });

    if (isNullish(organizationId)) {
      return undefined;
    }

    const subscription = await getAndLockExistingSubscription({
      tx,
      organizationId,
    });

    return await this.#apply({ tx, subscription, payment });
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
