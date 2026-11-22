import { isNullish, type Option, type Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { assertAdminMembership } from "./_helpers/memberships";
import { getSubscriptionReference } from "./_helpers/subscription-references";
import { getExistingSubscription } from "./_helpers/subscriptions";
import { PaymentsServiceContext } from "./_payments-service";

type Membership = Records["Core"]["Memberships"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];

export class CancelService extends PaymentsServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): CancelService {
    return new this(args);
  }

  prepare({
    userId,
    organizationId,
  }: {
    userId: Membership["userId"];
    organizationId: Membership["organizationId"];
  }): Promise<Result<Option<Pick<SubscriptionReference, "externalSubscriptionId">>>> {
    return this._withDbContext(async (tx) => {
      await assertAdminMembership({ tx, organizationId, userId });

      const { reference } = await this._getSubscription({
        tx,
        organizationId,
      });

      if (isNullish(reference)) {
        return undefined;
      }

      const { externalSubscriptionId } = reference;

      return { externalSubscriptionId };
    });
  }
}
