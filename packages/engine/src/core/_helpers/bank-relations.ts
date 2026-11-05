import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];

export const getBankRelation = async ({
  tx,
  id,
}: { tx: Tx } & Pick<SelectBankRelations, "id">): Promise<SelectBankRelations> => {
  const bankRelations = await selectMany({
    tx,
    table: DbSchema.Core.Bank.BankRelationsSchema,
    schema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    where: eq(DbSchema.Core.Bank.BankRelationsSchema.id, id),
  });

  assertArrayExactlyOne(bankRelations);

  const [bankRelation] = bankRelations;
  return bankRelation;
};

export const listBankRelations = async ({
  tx,
  organizationId,
  ...queryArgs
}: { tx: Tx } & Pick<SelectBankRelations, "organizationId"> &
  Required<SelectManyFilterArgs>): Promise<SelectBankRelations[]> =>
  await selectMany({
    tx,
    table: DbSchema.Core.Bank.BankRelationsSchema,
    schema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    where: eq(DbSchema.Core.Bank.BankRelationsSchema.organizationId, organizationId),
    ...queryArgs,
  });
