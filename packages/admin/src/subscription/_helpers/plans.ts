import { eq } from "drizzle-orm";
import { assertArrayExactlyOne, assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, selectMany, type Tx, updateMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const plans = DbSchema.Subscription.Plans.PlansSchema;

type Plan = Records["Subscription"]["Plans"]["Select"];

export const listPlans = async ({ tx }: { tx: Tx }): Promise<Plan[]> => {
  return await selectMany({
    tx,
    table: plans,
    schema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
  });
};

export const insertPlan = async ({
  tx,
  plan,
}: {
  tx: Tx;
  plan: Records["Subscription"]["Plans"]["Insert"];
}): Promise<Plan> => {
  const [row] = await insertMany({
    tx,
    table: plans,
    values: plan,
    returningSchema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
  });

  assertNonNullish(row);

  return row;
};

export const disablePlan = async ({
  tx,
  planId,
}: {
  tx: Tx;
  planId: Plan["id"];
}): Promise<Plan> => {
  const rows = await updateMany({
    tx,
    table: plans,
    values: { expiresAt: new Date() },
    returningSchema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
    where: eq(plans.id, planId),
  });

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return row;
};
