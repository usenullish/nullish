import * as z from "zod";
import { RecordsSchema } from "../../records";
import { FilterJournalSchema, SelectJournalSchema } from "./journal";

export const InvoiceJournalSchema =
  RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema.pick({
    invoiceId: true,
    type: true,
  });

export const PeriodJournalSchema =
  RecordsSchema.Ledger.PeriodJournalSchema.SelectPeriodJournalEntriesSchema.pick({
    periodId: true,
    type: true,
  });

export const MovementJournalSchema = z.strictObject({
  movementId:
    RecordsSchema.Banking.MovementJournalSchema.SelectMovementJournalEntriesSchema.shape.movementId,
  bankRelationId: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema.shape.bankRelationId,
});

export const PostingManualVatPostingSchema =
  RecordsSchema.Ledger.PostingManualVatPostingsSchema.SelectPostingManualVatPostingsSchema.pick({
    postingId: true,
    vatPostingId: true,
  });

export const SelectJournalSummariesSchema = z.strictObject({
  ...SelectJournalSchema.shape,
  invoiceJournal: InvoiceJournalSchema.nullable(),
  periodJournal: PeriodJournalSchema.nullable(),
  movementJournal: MovementJournalSchema.nullable(),
  vatPostings: z.array(PostingManualVatPostingSchema),
});

export const FilterJournalSummariesSchema = FilterJournalSchema;
