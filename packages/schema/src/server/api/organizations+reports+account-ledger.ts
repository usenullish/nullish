import { BigIntCodec, DateCodec, DateStringCodec } from "@usenullish/nullish-common";
import * as z from "zod";
import { RecordsSchema } from "../../records";
import { ReportsSchema } from "../../reports";

export const GetAccountLedgerQuerySchema = ReportsSchema.LedgerSchema.AccountLedgerArgsSchema;

export const GetAccountLedgerFiltersSchema =
  ReportsSchema.LedgerSchema.FilterAccountLedgerSchema.extend({
    validOnFrom: DateCodec.optional(),
    validOnTo: DateCodec.optional(),
  });
export const GetAccountLedgerFiltersQuerySchema =
  ReportsSchema.LedgerSchema.FilterAccountLedgerSchema.extend({
    number: z.coerce
      .number()
      .pipe(RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.number)
      .optional(),
    validOnFrom: DateStringCodec.optional(),
    validOnTo: DateStringCodec.optional(),
  });

export const AccountLedgerPostingResponseSchema =
  ReportsSchema.LedgerSchema.AccountLedgerPostingSchema.extend({
    validOn: DateCodec,
    debit: BigIntCodec.describe("Debit in the currency of the posting"),
    credit: BigIntCodec.describe("Credit in the currency of the posting"),
    baseDebit: BigIntCodec.describe("Debit converted to the base currency of the organization"),
    baseCredit: BigIntCodec.describe("Credit converted to the base currency of the organization"),
    balance: BigIntCodec.describe(
      "Balance of the account after this posting, in the base currency of the organization",
    ),
  });

export const AccountLedgerTotalsResponseSchema =
  ReportsSchema.LedgerSchema.AccountLedgerTotalsSchema.extend({
    baseDebit: BigIntCodec.describe(
      "Total debit of the filtered postings, in the base currency of the organization",
    ),
    baseCredit: BigIntCodec.describe(
      "Total credit of the filtered postings, in the base currency of the organization",
    ),
    balance: BigIntCodec.nullable().describe(
      "Balance of the account after the latest filtered posting, in the base currency of the organization, null without postings",
    ),
  });

export const GetAccountLedgerResponseSchema = z.strictObject({
  postings: z.array(AccountLedgerPostingResponseSchema),
  totals: AccountLedgerTotalsResponseSchema,
});
