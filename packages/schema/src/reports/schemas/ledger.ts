import * as z from "zod";
import { NotEmptyStringSchema } from "@usenullish/nullish-common";
import { ViewsSchema } from "../../views";
import { RecordsSchema } from "../../records";

export const LedgerReportArgsSchema = z.strictObject({
  periodId: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema.shape.id,
});

export const AccountBalancesSchema = z.array(
  ViewsSchema.Ledger.AccountBalancesView.SelectAccountBalancesView,
);
export const BalanceSheetSchema = z.array(
  ViewsSchema.Ledger.BalanceSheetView.SelectBalanceSheetView,
);
export const IncomeStatementSchema = z.array(
  ViewsSchema.Ledger.IncomeStatementView.SelectIncomeStatementView,
);

export const AccountLedgerArgsSchema = LedgerReportArgsSchema.extend({
  accountId: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema.shape.id,
});

export const AccountLedgerPostingSchema = z.strictObject({
  postingId: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.id,
  journalEntryId: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.id,
  number: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.number,
  validOn: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn,
  reference: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.reference,
  description: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.description,
  currency: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.currency,
  debit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.debit,
  credit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.credit,
  baseDebit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.debit,
  baseCredit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.credit,
  balance: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.debit,
});

export const AccountLedgerSchema = z.array(AccountLedgerPostingSchema);

export const AccountLedgerTotalsSchema = z.strictObject({
  baseDebit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.debit,
  baseCredit: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.credit,
  balance: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.debit.nullable(),
});

export const AccountLedgerReportSchema = z.strictObject({
  postings: AccountLedgerSchema,
  totals: AccountLedgerTotalsSchema,
});

export const AccountLedgerSortFieldSchema = AccountLedgerPostingSchema.keyof();

export const FilterAccountLedgerSchema = z.strictObject({
  number:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.number.optional(),
  validOnFrom:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn.optional(),
  validOnTo:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn.optional(),
  reference: NotEmptyStringSchema.optional(),
});

export const ActiveAccountIdsSchema = z.array(
  RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema.shape.id,
);
