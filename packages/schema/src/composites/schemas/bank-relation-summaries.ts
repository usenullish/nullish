import * as z from "zod";
import { RecordsSchema } from "../../records";

export const BankRelationMovementsSchema = z.strictObject({
  unreconciled: z.number().int().nonnegative(),
});

// The closing balance of the latest statement imported, i.e. what the bank says the account holds.
export const BankRelationBalanceSchema = z.strictObject({
  amount: RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema.shape.closingBalance,
  on: RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema.shape.endOn,
});

export const SelectBankRelationSummariesSchema = z.strictObject({
  bankRelation: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
  movements: BankRelationMovementsSchema,
  balance: BankRelationBalanceSchema.nullable(),
});
