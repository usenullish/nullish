import type { Tx } from "@usenullish/nullish-db";
import { insertMany, selectMany } from "@usenullish/nullish-db";
import { DbSchema, InvoiceJournalEntryType } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectInvoiceJournalEntry = Records["Billing"]["InvoiceJournal"]["Select"];
type SelectInvoiceJournalEntries = SelectInvoiceJournalEntry[];

type InsertInvoiceJournalEntry = Records["Billing"]["InvoiceJournal"]["Insert"];

export const getInvoiceJournalEntryForInvoice = async ({
  tx,
  invoiceId,
  entryType,
}: {
  tx: Tx;
  invoiceId: SelectInvoiceJournalEntry["invoiceId"];
  entryType: InvoiceJournalEntryType;
}): Promise<SelectInvoiceJournalEntry> => {
  const entries = await selectMany({
    tx,
    table: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
    schema: RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema,
    where: and(
      eq(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId, invoiceId),
      eq(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.type, entryType),
    ),
  });

  assertArrayExactlyOne(entries);

  const [journalEntry] = entries;
  return journalEntry;
};

export const listInvoiceJournalEntries = async ({
  tx,
  invoiceId,
  entryType,
}: {
  tx: Tx;
  invoiceId: SelectInvoiceJournalEntry["invoiceId"];
  entryType: InvoiceJournalEntryType;
}): Promise<SelectInvoiceJournalEntries> => {
  return await selectMany({
    tx,
    table: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
    schema: RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema,
    where: and(
      eq(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId, invoiceId),
      eq(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.type, entryType),
    ),
  });
};

export const insertInvoiceJournalEntry = async ({
  organizationId,
  journalEntryId,
  invoiceId,
  entryType,
  tx,
}: {
  organizationId: InsertInvoiceJournalEntry["organizationId"];
  journalEntryId: InsertInvoiceJournalEntry["journalEntryId"];
  invoiceId: InsertInvoiceJournalEntry["invoiceId"];
  entryType: InvoiceJournalEntryType;
  tx: Tx;
}): Promise<void> => {
  const recordedPayments = await insertMany({
    tx,
    table: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
    values: [{ organizationId, invoiceId, journalEntryId, type: entryType }],
    returningSchema: RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema,
  });

  assertArrayExactlyOne(recordedPayments);
};
