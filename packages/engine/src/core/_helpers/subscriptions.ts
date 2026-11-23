import type { Tx } from "@usenullish/nullish-db";
import { and, eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;

export const getSelfSubscriptionTrialEnd = async ({
  tx,
  organizationId,
}: {
  tx: Tx;
  organizationId: Subscription["organizationId"];
}): Promise<Option<NonNullable<Subscription["periodEnd"]>>> => {
  const rows = await tx
    .select({ periodEnd: subscriptions.periodEnd })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, SubscriptionStatus.TRIALING),
        eq(plans.provider, SubscriptionProvider.SELF),
      ),
    );

  assertArrayAtMostOne(rows);

  const [row] = rows;

  return row?.periodEnd ?? undefined;
};
