import { isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { type PostgresDbInstance, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { type AdminServiceContextArgs } from "./_admin-service";
import { getExternalProduct } from "./_helpers/external-products";
import { getSubscriptionTaxRate } from "./_helpers/subscription-tax-rates";
import { PaymentsServiceContext } from "./_payments-service";

type Membership = Records["Core"]["Memberships"]["Select"];
type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];
type ExternalProductId = Records["Subscription"]["ExternalProducts"]["Select"]["externalProductId"];

export class CheckoutService extends PaymentsServiceContext {
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
      await this.#assert({
        tx,
        userId,
        organizationId,
        provider,
        externalProductId,
      });

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
    await this._assertAdminMembership({ tx, organizationId, userId });

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
    const {
      reference,
      subscription: { id: subscriptionId },
    } = await this._getSubscription({
      tx,
      organizationId,
    });

    if (nonNullish(reference)) {
      throw new Error(
        `Subscription ${subscriptionId} is already linked to an external subscription.`,
      );
    }
  }
}
