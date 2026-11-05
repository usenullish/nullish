import { BillingSchema } from "./_schema";
import { primaryKey } from "../_common";
import { invoiceIdCascadeReference } from "./invoices";
import { organizationIdReference } from "../core/organizations";
import { journalEntryIdReference } from "../ledger/journal";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { InvoiceJournalEntryType } from "../../constants/invoice-journal";

export const invoiceJournalEntryType = BillingSchema.enum(
  "invoice_journal_entry_type",
  InvoiceJournalEntryType,
);

export const InvoiceJournalEntriesSchema = BillingSchema.table(
  "invoice_journal_entries",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    invoiceId: invoiceIdCascadeReference(),
    journalEntryId: journalEntryIdReference(),
    type: invoiceJournalEntryType().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("invoice_journal_entries_journal_entry_id_uidx").on(table.journalEntryId),
    // At most one "open" entry per invoice
    pg
      .uniqueIndex("invoice_journal_entries_invoice_open_uidx")
      .on(table.invoiceId)
      .where(sql`${table.type} = 'open'`),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "invoice_journal_entries",
    }),
  ],
);
