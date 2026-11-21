import { isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { type PostgresDbInstance, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { getExternalProduct } from "./_helpers/external-products";
import { assertAdminMembership } from "./_helpers/memberships";
import { getSubscriptionReference } from "./_helpers/subscription-references";
import { getExistingSubscription } from "./_helpers/subscriptions";
import { getSubscriptionTaxRate } from "./_helpers/subscription-tax-rates";

type Membership = Records["Core"]["Memberships"]["Select"];
type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];
type ExternalProductId = Records["Subscription"]["ExternalProducts"]["Select"]["externalProductId"];

export class CheckoutService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): CheckoutService {
    return new this(args);
  }

  prepare({
    userId,
    organizationId,
    provider,
    externalProductId,
    validOn,
  }: {
    userId: Membership["userId"];
    organizationId: Membership["organizationId"];
    provider: SubscriptionProvider;
    externalProductId: ExternalProductId;
    validOn: SubscriptionTaxRate["startOn"];
  }): Promise<Result<{ externalTaxRateId: SubscriptionTaxRate["externalTaxRateId"] }>> {
    return this._withDbContext(async (tx) => {
      await this.#assert({ tx, userId, organizationId, provider, externalProductId });

      const taxRate = await getSubscriptionTaxRate({ tx, provider, validOn });

      if (isNullish(taxRate)) {
        throw new Error(
          `No ${provider} tax rate is valid on ${validOn.toISOString().slice(0, 10)}.`,
        );
      }

      return { externalTaxRateId: taxRate.externalTaxRateId };
    });
  }

  async #assert({
    tx,
    userId,
    organizationId,
    provider,
    externalProductId,
  }: {
    tx: Tx;
    userId: Membership["userId"];
    organizationId: Membership["organizationId"];
    provider: SubscriptionProvider;
    externalProductId: ExternalProductId;
  }): Promise<void> {
    await assertAdminMembership({ tx, organizationId, userId });

    await this.#assertProductHasPlan({ tx, provider, externalProductId });

    await this.#assertNotLinked({ tx, organizationId });
  }

  async #assertProductHasPlan({
    tx,
    provider,
    externalProductId,
  }: {
    tx: Tx;
    provider: SubscriptionProvider;
    externalProductId: ExternalProductId;
  }): Promise<void> {
    // Product not found throw
    await getExternalProduct({ tx, provider, externalProductId });
  }

  async #assertNotLinked({
    tx,
    organizationId,
  }: {
    tx: Tx;
    organizationId: Membership["organizationId"];
  }): Promise<void> {
    const subscription = await getExistingSubscription({ tx, organizationId });

    const reference = await getSubscriptionReference({ tx, subscriptionId: subscription.id });

    if (nonNullish(reference)) {
      throw new Error(
        `Subscription ${subscription.id} is already linked to an external subscription.`,
      );
    }
  }
}
