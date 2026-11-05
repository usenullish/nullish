import type { ServicesSchema } from "./_schemas";
import type { z } from "zod";

interface Services {
  Invoices: {
    Pay: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.PayInvoiceArgsSchema>;
    };
    Void: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.VoidInvoiceArgsSchema>;
    };
    Uncollectible: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.UncollectibleInvoiceArgsSchema>;
    };
    GeneratePdf: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.GeneratePdfInvoiceArgsSchema>;
    };
    PdfJobState: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.PdfInvoiceJobStateArgsSchema>;
      Result: z.infer<typeof ServicesSchema.InvoicesSchema.PdfInvoiceJobStateResultSchema>;
    };
    PdfStream: {
      Args: z.infer<typeof ServicesSchema.InvoicesSchema.PdfInvoiceStreamArgsSchema>;
      Result: z.infer<typeof ServicesSchema.InvoicesSchema.PdfInvoiceStreamResultSchema>;
    };
  };
  Camt: {
    Document: z.infer<typeof ServicesSchema.CamtSchema.Camt053DocumentSchema>;
    Statement: z.infer<typeof ServicesSchema.CamtSchema.CamtStatementSchema>;
    Movement: z.infer<typeof ServicesSchema.CamtSchema.CamtMovementSchema>;
    MovementDedupe: z.input<typeof ServicesSchema.CamtSchema.CamtMovementDedupeSchema>;
  };
  Banking: {
    ImportStatements: {
      Args: z.infer<typeof ServicesSchema.BankingSchema.ImportStatementsArgsSchema>;
      Result: z.infer<typeof ServicesSchema.BankingSchema.ImportStatementsResultSchema>;
    };
    ReconcileMovement: {
      Args: z.infer<typeof ServicesSchema.BankingSchema.ReconcileMovementArgsSchema>;
    };
  };
  Migration: {
    UploadDataset: {
      Args: z.infer<typeof ServicesSchema.MigrationSchema.UploadDatasetArgsSchema>;
      Result: z.infer<typeof ServicesSchema.MigrationSchema.UploadDatasetResultSchema>;
    };
  };
}

export type { Services };
