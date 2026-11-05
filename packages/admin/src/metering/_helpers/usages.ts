import { and, eq, gte, sql } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const usages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

type SelectLlmUsages = Records["Metering"]["LlmUsages"]["Select"];
type InsertLlmUsages = Records["Metering"]["LlmUsages"]["Insert"];

export const insertUsage = async ({
  tx,
  usage,
}: {
  tx: Tx;
  usage: InsertLlmUsages;
}): Promise<SelectLlmUsages> => {
  const rows = await tx.insert(usages).values(usage).returning();

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return RecordsSchema.Metering.LlmUsagesSchema.SelectLlmUsagesSchema.parse(row);
};

export const getUsedTokens = async ({
  tx,
  userId,
  model,
  from,
}: Pick<SelectLlmUsages, "model"> & {
  tx: Tx;
  userId: NonNullable<SelectLlmUsages["userId"]>;
  from: Date;
}): Promise<bigint> => {
  const rows = await tx
    .select({
      tokens: sql<bigint>`COALESCE(SUM(${usages.inputTokens} + ${usages.outputTokens}), 0)`.mapWith(
        BigInt,
      ),
    })
    .from(usages)
    .where(and(eq(usages.userId, userId), eq(usages.model, model), gte(usages.loggedAt, from)));

  assertArrayExactlyOne(rows);

  const [{ tokens }] = rows;
  return tokens;
};
