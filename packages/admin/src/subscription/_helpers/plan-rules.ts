import { assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

type PlanRules = Records["Subscription"]["PlanRules"]["Select"];

export const insertPlanRules = async ({
  tx,
  rules,
}: {
  tx: Tx;
  rules: Records["Subscription"]["PlanRules"]["Insert"];
}): Promise<PlanRules> => {
  const [row] = await insertMany({
    tx,
    table: planRules,
    values: rules,
    returningSchema: RecordsSchema.Subscription.PlanRulesSchema.SelectPlanRulesSchema,
  });

  assertNonNullish(row);

  return row;
};
