import { AdminServiceContext } from "./_admin-service";
import { getExistingSubscription } from "./_helpers/subscriptions";
import { getSubscriptionReference } from "./_helpers/subscription-references";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Option } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { MembershipRole } from "@usenullish/nullish-schema/db";
import { getMembership } from "./_helpers/memberships";

type Membership = Records["Core"]["Memberships"]["Select"];
type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];

export class PaymentsServiceContext extends AdminServiceContext {
  protected async _assertAdminMembership({
    tx,
    organizationId,
    userId,
  }: {
    tx: Tx;
    organizationId: Membership["organizationId"];
    userId: Membership["userId"];
  }): Promise<void> {
    const membership = await getMembership({ tx, organizationId, userId });

    if (membership.role !== MembershipRole.ADMIN) {
      throw new Error(`User ${userId} is not an admin of organization ${organizationId}.`);
    }
  }

  protected async _getSubscription({
    tx,
    organizationId,
  }: {
    tx: Tx;
    organizationId: Membership["organizationId"];
  }): Promise<{
    subscription: Subscription;
    reference: Option<SubscriptionReference>;
  }> {
    const subscription = await getExistingSubscription({ tx, organizationId });

    const reference = await getSubscriptionReference({
      tx,
      subscriptionId: subscription.id,
    });

    return {
      subscription,
      reference,
    };
  }
}
