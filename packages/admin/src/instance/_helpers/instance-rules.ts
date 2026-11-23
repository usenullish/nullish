import {
  assertArrayAtMostOne,
  assertArrayExactlyOne,
  type Option,
} from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

type InstanceRules = Records["Instance"]["InstanceRules"]["Select"];

export const getInstanceRules = async ({ tx }: { tx: Tx }): Promise<Option<InstanceRules>> => {
  const rows = await selectMany({
    tx,
    table: instanceRules,
    schema: RecordsSchema.Instance.InstanceRulesSchema.SelectInstanceRulesSchema,
  });

  assertArrayAtMostOne(rows);

  const [row] = rows;
  return row;
};

export const upsertInstanceRules = async ({
  tx,
  rules,
}: {
  tx: Tx;
  rules: Records["Instance"]["InstanceRules"]["Insert"];
}): Promise<InstanceRules> => {
  const rows = await tx
    .insert(instanceRules)
    .values(rules)
    .onConflictDoUpdate({ target: instanceRules.id, set: rules })
    .returning();

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return RecordsSchema.Instance.InstanceRulesSchema.SelectInstanceRulesSchema.parse(row);
};
