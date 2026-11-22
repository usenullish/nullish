import { isNullish, type Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { assertAdminMembership } from "./_helpers/memberships";
import { getSubscriptionReference } from "./_helpers/subscription-references";
import { getExistingSubscription } from "./_helpers/subscriptions";
import { PaymentsServiceContext } from "./_payments-service";

type Membership = Records["Core"]["Memberships"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];

export class ManageService extends PaymentsServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): ManageService {
    return new this(args);
  }

  prepare({
    userId,
    organizationId,
  }: {
    userId: Membership["userId"];
    organizationId: Membership["organizationId"];
  }): Promise<Result<Pick<SubscriptionReference, "externalCustomerId">>> {
    return this._withDbContext(async (tx) => {
      await assertAdminMembership({ tx, organizationId, userId });

      const {
        reference,
        subscription: { id: subscriptionId },
      } = await this._getSubscription({
        tx,
        organizationId,
      });

      if (isNullish(reference)) {
        throw new Error(
          `Subscription ${subscriptionId} is not linked to an external subscription.`,
        );
      }

      const { externalCustomerId } = reference;

      return { externalCustomerId };
    });
  }
}
