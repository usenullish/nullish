import { and, eq, isNotNull } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const plans = DbSchema.Subscription.Plans.PlansSchema;

type Plan = Records["Subscription"]["Plans"]["Select"];

export const getPlanByExternalProduct = async ({
  tx,
  provider,
  externalProductId,
}: {
  tx: Tx;
  provider: SubscriptionProvider;
  externalProductId: NonNullable<Plan["externalProductId"]>;
}): Promise<Plan> => {
  const rows = await selectMany({
    tx,
    table: plans,
    schema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
    where: and(eq(plans.provider, provider), eq(plans.externalProductId, externalProductId)),
  });

  assertArrayExactlyOne(rows);

  const [plan] = rows;
  return plan;
};

export const listPlansWithProduct = async ({ tx }: { tx: Tx }): Promise<Plan[]> => {
  return await selectMany({
    tx,
    table: plans,
    schema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
    where: isNotNull(plans.externalProductId),
  });
};
