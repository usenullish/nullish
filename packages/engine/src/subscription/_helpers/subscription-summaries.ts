import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { DbSchema, OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { eq, sql } from "drizzle-orm";

type SubscriptionSummary = Composites["SubscriptionSummaries"]["Select"];

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;

export const listSubscriptionSummaries = async ({
  tx,
  organizationId,
  orderBy,
  pagination: { limit, offset },
}: {
  tx: Tx;
  organizationId: Records["Subscription"]["Subscriptions"]["Select"]["organizationId"];
} & Required<SelectManyFilterArgs>): Promise<SubscriptionSummary[]> => {
  const rows = await tx
    .select({
      subscription: subscriptions,
      plan: { provider: plans.provider },
      status: sql<OrganizationSubscriptionStatus>`CASE
          WHEN NOT subscription.organization_subscription_is_valid(${subscriptions.organizationId}) THEN ${OrganizationSubscriptionStatus.LOCKED}::text
          WHEN ${subscriptions.status} = 'past_due' THEN ${OrganizationSubscriptionStatus.GRACE}::text
          ELSE ${OrganizationSubscriptionStatus.OPEN}::text
        END`,
      expiresAt: sql`CASE
          WHEN ${subscriptions.status} = 'past_due' THEN ${subscriptions.periodEnd} + make_interval(days => (SELECT st.grace_days FROM subscription.subscription_settings st))
          ELSE ${subscriptions.periodEnd}
        END`.mapWith(subscriptions.periodEnd),
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return rows.map(({ subscription, plan, status, expiresAt }) =>
    CompositesSchema.SubscriptionSummariesSchema.SelectSubscriptionSummariesSchema.parse({
      subscription,
      plan,
      organization:
        status === OrganizationSubscriptionStatus.LOCKED ? { status } : { status, expiresAt },
    }),
  );
};
