import type { CompositesSchema } from "./_schemas";
import type { z } from "zod";

interface Composites {
  Journal: {
    Select: z.infer<typeof CompositesSchema.JournalSchema.SelectJournalSchema>;
    Insert: z.infer<typeof CompositesSchema.JournalSchema.InsertJournalSchema>;
    Update: z.infer<typeof CompositesSchema.JournalSchema.UpdateJournalSchema>;
    Filter: z.infer<typeof CompositesSchema.JournalSchema.FilterJournalSchema>;
  };
  JournalSummaries: {
    Select: z.infer<typeof CompositesSchema.JournalSummariesSchema.SelectJournalSummariesSchema>;
    Filter: z.infer<typeof CompositesSchema.JournalSummariesSchema.FilterJournalSummariesSchema>;
  };
  InvoiceSummaries: {
    Select: z.infer<typeof CompositesSchema.InvoiceSummariesSchema.SelectInvoiceSummariesSchema>;
    Amounts: z.infer<typeof CompositesSchema.InvoiceSummariesSchema.InvoiceAmountsSchema>;
    Filter: z.infer<typeof CompositesSchema.InvoiceSummariesSchema.FilterInvoiceSummariesSchema>;
  };
  BankRelationSummaries: {
    Select: z.infer<
      typeof CompositesSchema.BankRelationSummariesSchema.SelectBankRelationSummariesSchema
    >;
  };
  MovementSummaries: {
    Select: z.infer<typeof CompositesSchema.MovementSummariesSchema.SelectMovementSummariesSchema>;
    Filter: z.infer<typeof CompositesSchema.MovementSummariesSchema.FilterMovementSummariesSchema>;
  };
  VatMethodSummaries: {
    Select: z.infer<
      typeof CompositesSchema.VatMethodSummariesSchema.SelectVatMethodSummariesSchema
    >;
  };
  DatasetSummaries: {
    Select: z.infer<typeof CompositesSchema.DatasetSummariesSchema.SelectDatasetSummariesSchema>;
    Filter: z.infer<typeof CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema>;
  };
  Chat: {
    Select: z.infer<typeof CompositesSchema.ChatSchema.SelectChatSchema>;
  };
}

export type { Composites };
