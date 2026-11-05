import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { assertArrayAtMostOne, isNullish, type Option } from "@usenullish/nullish-common";
import { desc, inArray } from "drizzle-orm";

type SelectStatements = Records["Banking"]["Statements"]["Select"];
type InsertStatements = Records["Banking"]["Statements"]["Insert"];

export const insertNotConflictingNewStatement = async ({
  tx,
  values,
}: {
  tx: Tx;
  values: InsertStatements;
}): Promise<Option<SelectStatements>> => {
  const statements = DbSchema.Banking.Statements.StatementsSchema;

  const rows = await tx
    .insert(statements)
    .values(values)
    .onConflictDoNothing({ target: [statements.bankRelationId, statements.bankStatementId] })
    .returning();

  assertArrayAtMostOne(rows);

  const [row] = rows;
  return isNullish(row)
    ? undefined
    : RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema.parse(row);
};

export const listLatestClosingBalances = async ({
  tx,
  bankRelationIds,
}: {
  tx: Tx;
  bankRelationIds: [SelectStatements["bankRelationId"], ...SelectStatements["bankRelationId"][]];
}): Promise<
  Map<
    SelectStatements["bankRelationId"],
    { amount: SelectStatements["closingBalance"]; on: SelectStatements["endOn"] }
  >
> => {
  const statements = DbSchema.Banking.Statements.StatementsSchema;

  const rows = await tx
    .selectDistinctOn([statements.bankRelationId], {
      bankRelationId: statements.bankRelationId,
      closingBalance: statements.closingBalance,
      endOn: statements.endOn,
    })
    .from(statements)
    .where(inArray(statements.bankRelationId, bankRelationIds))
    .orderBy(statements.bankRelationId, desc(statements.endOn), desc(statements.createdAt));

  const parsedRows = RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema.pick({
    bankRelationId: true,
    closingBalance: true,
    endOn: true,
  })
    .array()
    .parse(rows);

  return new Map(
    parsedRows.map(({ bankRelationId, closingBalance, endOn }) => [
      bankRelationId,
      { amount: closingBalance, on: endOn },
    ]),
  );
};
