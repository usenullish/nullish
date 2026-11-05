import type { Tx } from "@usenullish/nullish-db";
import { isNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { AccountType, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";

type JournalEntry = Records["Ledger"]["JournalEntries"]["Select"];
type Posting = Records["Ledger"]["Postings"]["Select"];

export type OpeningPosting = Pick<
  Posting,
  "accountId" | "description" | "debit" | "credit" | "currency" | "exchangeRate" | "vatRateId"
>;

export class CreateJournalError extends Error {}

export const createJournal = async ({
  tx,
  organizationId,
  validOn,
  reference,
  migrated = false,
  postings,
}: {
  tx: Tx;
  postings: [OpeningPosting, ...OpeningPosting[]];
} & Pick<JournalEntry, "organizationId" | "validOn" | "reference"> &
  Partial<Pick<JournalEntry, "migrated">>): Promise<Result<void>> => {
  return tryCatch(async () => {
    const [entry] = await tx
      .insert(DbSchema.Ledger.Journal.JournalEntriesSchema)
      .values({ organizationId, validOn, reference, migrated })
      .returning({ id: DbSchema.Ledger.Journal.JournalEntriesSchema.id });

    if (isNullish(entry)) {
      throw new CreateJournalError("The journal entry could not be inserted.");
    }

    await tx
      .insert(DbSchema.Ledger.Journal.PostingsSchema)
      .values(
        postings.map((posting) => ({ ...posting, organizationId, journalEntryId: entry.id })),
      );
  });
};

const JournalEntryWithVatRatesSchema = z.strictObject({
  id: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.id,
  reference: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.reference,
  validOn: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn,
  vatRateIds: z.array(
    RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.vatRateId.unwrap(),
  ),
  // True when the entry books revenue, i.e. one of its postings credits an income account. For an
  // invoice, it tells its sale entry apart from its payments, which only move the bank and the debtor.
  // The Bexio migration needs it to link the sale entry to the imported invoice. Bexio uses the same
  // reference for both, and the dates can match when an invoice is paid the day it is issued. Left
  // unlinked, the sale would be counted twice in the VAT declaration: once by the invoice and once as
  // a plain journal entry.
  creditsIncome: z.boolean(),
});

const JournalEntriesWithVatRatesSchema = z.array(JournalEntryWithVatRatesSchema);

export type JournalEntryWithVatRates = z.infer<typeof JournalEntryWithVatRatesSchema>;

// The VAT rates are the distinct ones booked on the postings of each journal entry.
export const listJournalEntriesWithVatRatesByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<JournalEntry, "organizationId">): Promise<
  Result<JournalEntryWithVatRates[]>
> => {
  return tryCatch(async () => {
    const rows = await tx
      .select({
        id: DbSchema.Ledger.Journal.JournalEntriesSchema.id,
        reference: DbSchema.Ledger.Journal.JournalEntriesSchema.reference,
        validOn: DbSchema.Ledger.Journal.JournalEntriesSchema.validOn,
        vatRateIds: sql<unknown>`coalesce(jsonb_agg(distinct ${DbSchema.Ledger.Journal.PostingsSchema.vatRateId}) filter (where ${DbSchema.Ledger.Journal.PostingsSchema.vatRateId} is not null), '[]'::jsonb)`,
        creditsIncome: sql<boolean>`bool_or(${DbSchema.Ledger.Accounts.AccountsSchema.type} = ${AccountType.INCOME} and ${DbSchema.Ledger.Journal.PostingsSchema.credit} > 0)`,
      })
      .from(DbSchema.Ledger.Journal.JournalEntriesSchema)
      .innerJoin(
        DbSchema.Ledger.Journal.PostingsSchema,
        eq(
          DbSchema.Ledger.Journal.PostingsSchema.journalEntryId,
          DbSchema.Ledger.Journal.JournalEntriesSchema.id,
        ),
      )
      .innerJoin(
        DbSchema.Ledger.Accounts.AccountsSchema,
        eq(
          DbSchema.Ledger.Journal.PostingsSchema.accountId,
          DbSchema.Ledger.Accounts.AccountsSchema.id,
        ),
      )
      .where(eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId))
      .groupBy(DbSchema.Ledger.Journal.JournalEntriesSchema.id);

    return JournalEntriesWithVatRatesSchema.parse(rows);
  });
};
