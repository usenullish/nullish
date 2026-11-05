import * as z from "zod";
import { BigIntCodec, DateCodec } from "@usenullish/nullish-common";
import { CompositesSchema } from "../../composites";
import { BankRelationsResponseSchema } from "./bank-relations";

export const BankRelationSummarySchema = z.strictObject({
  bankRelation: BankRelationsResponseSchema,
  movements: CompositesSchema.BankRelationSummariesSchema.BankRelationMovementsSchema,
  balance: z
    .strictObject({
      amount: BigIntCodec.describe(
        "Closing balance of the latest statement imported, in the smallest unit of the currency of the bank relation.",
      ),
      on: DateCodec.describe("The last day of that statement."),
    })
    .nullable()
    .describe("What the bank says the account holds, null when no statement was imported."),
});

export const GetBankRelationSummariesResponseSchema = z.strictObject({
  bankRelationSummaries: z.array(BankRelationSummarySchema),
});
