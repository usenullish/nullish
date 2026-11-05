import type { Tx } from "@usenullish/nullish-db";
import { assertNonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import {
  DbSchema,
  type InvoiceJournalEntryType,
  type InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type Line = Records["Billing"]["Lines"]["Select"];
type InvoiceJournalEntry = Records["Billing"]["InvoiceJournal"]["Select"];

type InvoiceFields = Pick<
  Invoice,
  "clientId" | "issueOn" | "dueOn" | "currency" | "exchangeRate" | "vatRateId"
>;

type LineFields = Pick<Line, "type" | "description" | "quantity" | "unitPrice">;

type InvoiceJournalEntryFields = Pick<InvoiceJournalEntry, "journalEntryId"> & {
  type: InvoiceJournalEntryType;
};

export const listInvoiceJournalEntriesByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<Invoice, "organizationId">): Promise<Result<InvoiceJournalEntry[]>> => {
  return tryCatch(async () => {
    const rows = await tx
      .select({
        invoiceJournalEntry: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
      })
      .from(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema)
      .innerJoin(
        DbSchema.Billing.Invoices.InvoicesSchema,
        eq(
          DbSchema.Billing.Invoices.InvoicesSchema.id,
          DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId,
        ),
      )
      .where(eq(DbSchema.Billing.Invoices.InvoicesSchema.organizationId, organizationId));

    return rows.map(({ invoiceJournalEntry }) =>
      RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema.parse(
        invoiceJournalEntry,
      ),
    );
  });
};

// Invoices are inserted as draft because lines can only be added to a draft
export const createInvoice = async ({
  tx,
  organizationId,
  invoice,
  lines,
}: {
  tx: Tx;
  organizationId: Invoice["organizationId"];
  invoice: InvoiceFields;
  lines: [LineFields, ...LineFields[]];
}): Promise<Result<Invoice>> => {
  return tryCatch(async () => {
    const [created] = await tx
      .insert(DbSchema.Billing.Invoices.InvoicesSchema)
      .values({ organizationId, ...invoice })
      .returning();

    assertNonNullish(created, "The invoice could not be inserted.");

    await tx
      .insert(DbSchema.Billing.Invoices.LinesSchema)
      .values(lines.map((line) => ({ organizationId, invoiceId: created.id, ...line })));

    return RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema.parse(created);
  });
};

export const updateInvoiceStatus = async ({
  tx,
  invoiceId,
  status,
}: {
  tx: Tx;
  invoiceId: Invoice["id"];
  status: InvoiceStatus;
}): Promise<Result<Invoice>> => {
  return tryCatch(async () => {
    const [updated] = await tx
      .update(DbSchema.Billing.Invoices.InvoicesSchema)
      .set({ status })
      .where(eq(DbSchema.Billing.Invoices.InvoicesSchema.id, invoiceId))
      .returning();

    assertNonNullish(updated, `The invoice ${invoiceId} could not be updated.`);

    return RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema.parse(updated);
  });
};

export const createInvoiceJournalEntries = async ({
  tx,
  organizationId,
  invoiceId,
  entries,
}: {
  tx: Tx;
  organizationId: Invoice["organizationId"];
  invoiceId: Invoice["id"];
  entries: [InvoiceJournalEntryFields, ...InvoiceJournalEntryFields[]];
}): Promise<Result<InvoiceJournalEntry[]>> => {
  return tryCatch(async () => {
    const created = await tx
      .insert(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema)
      .values(entries.map((entry) => ({ organizationId, invoiceId, ...entry })))
      .returning();

    return created.map((entry) =>
      RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema.parse(entry),
    );
  });
};
