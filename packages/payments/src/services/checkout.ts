import { nonNullish, type Result } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import type { PostgresDbInstance, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { getClaimByExternalProduct } from "./_helpers/claims";
import { getMembership } from "./_helpers/memberships";
import { getSubscriptionReference } from "./_helpers/subscription-references";
import { getAndLockExistingSubscription } from "./_helpers/subscriptions";

type Membership = Records["Core"]["Memberships"]["Select"];
type ExternalProductId = NonNullable<
  Records["Subscription"]["Claims"]["Select"]["externalProductId"]
>;

export class CheckoutService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): CheckoutService {
    return new this(args);
  }

  checkout({
    userId,
    organizationId,
    provider,
    externalProductId,
  }: {
    userId: Membership["userId"];
    organizationId: Membership["organizationId"];
    provider: SubscriptionProvider;
    externalProductId: ExternalProductId;
  }): Promise<Result<void>> {
    return this._withDbContext(async (tx) => {
      await this.#assertAdmin({ tx, organizationId, userId });

      await this.#assertProductHasClaim({ tx, provider, externalProductId });

      await this.#assertNotLinked({ tx, organizationId });
    });
  }

  async #assertAdmin({
    tx,
    organizationId,
    userId,
  }: {
    tx: Tx;
    organizationId: Membership["organizationId"];
    userId: Membership["userId"];
  }): Promise<void> {
    const membership = await getMembership({ tx, organizationId, userId });

    if (membership.role !== "admin") {
      throw new Error(`User ${userId} is not an admin of organization ${organizationId}.`);
    }
  }

  async #assertProductHasClaim({
    tx,
    provider,
    externalProductId,
  }: {
    tx: Tx;
    provider: SubscriptionProvider;
    externalProductId: ExternalProductId;
  }): Promise<void> {
    // Claim not found throw
    await getClaimByExternalProduct({ tx, provider, externalProductId });
  }

  async #assertNotLinked({
    tx,
    organizationId,
  }: {
    tx: Tx;
    organizationId: Membership["organizationId"];
  }): Promise<void> {
    const subscription = await getAndLockExistingSubscription({ tx, organizationId });

    const reference = await getSubscriptionReference({ tx, subscriptionId: subscription.id });

    if (nonNullish(reference)) {
      throw new Error(
        `Subscription ${subscription.id} is already linked to an external subscription.`,
      );
    }
  }
}
