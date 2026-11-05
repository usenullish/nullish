import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { InvoiceJournalEntriesSchema } from "../../../db/schemas/billing/invoice-journal";
import { INSERT_OMIT_FIELDS } from "../../../primitives";
import { InvoiceJournalEntryType } from "../../../db";
import * as z from "zod";

// Drizzle does not correctly infer the enum
const refineInvoiceJournalEntryTypeEnums = {
  type: z.enum(InvoiceJournalEntryType),
};

export const SelectInvoiceJournalEntriesSchema = createSelectSchema(
  InvoiceJournalEntriesSchema,
  refineInvoiceJournalEntryTypeEnums,
);
export const InsertInvoiceJournalEntriesSchema = createInsertSchema(
  InvoiceJournalEntriesSchema,
  refineInvoiceJournalEntryTypeEnums,
).omit(INSERT_OMIT_FIELDS);
// Update is disallowed for invoice journal entries, only inserts
