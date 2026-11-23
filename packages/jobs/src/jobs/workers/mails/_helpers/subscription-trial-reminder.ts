import { and, eq, isNull } from "drizzle-orm";
import type { Tx } from "@usenullish/nullish-db";
import { assertArrayAtMostOne, isNullish, type Option } from "@usenullish/nullish-common";
import {
  DbSchema,
  DbView,
  MembershipRole,
  SubscriptionProvider,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import type { Jobs } from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Views } from "@usenullish/nullish-schema/views";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type Organization = Records["Core"]["Organizations"]["Select"];
type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;
const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const members = DbView.Core.OrganizationMembers.OrganizationMembersView;

export interface TrialingSubscription {
  subscription: { periodEnd: NonNullable<Subscription["periodEnd"]> };
  organization: Pick<Organization, "name">;
  member: Pick<OrganizationMember, "email">;
}

export const getTrialingSubscription = async ({
  tx,
  organizationId,
  userId,
}: { tx: Tx } & Pick<
  Jobs["Mails"]["SubscriptionTrialReminderPayload"],
  "organizationId" | "userId"
>): Promise<Option<TrialingSubscription>> => {
  const rows = await tx
    .select({
      periodEnd: subscriptions.periodEnd,
      name: organizations.name,
      email: members.email,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .innerJoin(members, eq(members.organizationId, organizations.id))
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, SubscriptionStatus.TRIALING),
        eq(plans.provider, SubscriptionProvider.SELF),
        isNull(organizations.deletedAt),
        eq(members.userId, userId),
        eq(members.role, MembershipRole.ADMIN),
      ),
    );

  assertArrayAtMostOne(rows);

  const [row] = rows;

  if (isNullish(row) || isNullish(row.periodEnd)) {
    return undefined;
  }

  const { periodEnd, name, email } = row;

  return {
    subscription: { periodEnd },
    organization: { name },
    member: { email },
  };
};
