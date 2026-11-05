import * as z from "zod";
import { CompositesSchema } from "../../composites";
import {
  GetJournalEntriesFiltersQuerySchema,
  GetJournalEntriesFiltersSchema,
  PostingResponseSchema,
} from "./journal";

export const JournalSummarySchema = z.strictObject({
  ...PostingResponseSchema.shape,
  invoiceJournal: CompositesSchema.JournalSummariesSchema.InvoiceJournalSchema.nullable(),
  periodJournal: CompositesSchema.JournalSummariesSchema.PeriodJournalSchema.nullable(),
  movementJournal: CompositesSchema.JournalSummariesSchema.MovementJournalSchema.nullable(),
  vatPostings: z.array(CompositesSchema.JournalSummariesSchema.PostingManualVatPostingSchema),
});

export const GetJournalSummariesResponseSchema = z.strictObject({
  journalSummaries: z.array(JournalSummarySchema),
});
export const GetJournalSummaryResponseSchema = z.strictObject({
  journalSummary: JournalSummarySchema.nullish(),
});

export const GetJournalSummariesFiltersSchema = GetJournalEntriesFiltersSchema;
export const GetJournalSummariesFiltersQuerySchema = GetJournalEntriesFiltersQuerySchema;
