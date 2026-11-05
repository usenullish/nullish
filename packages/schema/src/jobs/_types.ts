import type { JobsSchema } from "./_schemas";
import type { z } from "zod";
import type { ScheduledJobState, TriggerJobs } from "./_trigger";

interface Jobs {
  PdfInvoices: {
    Payload: z.infer<typeof JobsSchema.PdfInvoicesSchema.PdfInvoicePayloadSchema>;
    Template: z.infer<typeof JobsSchema.PdfInvoicesSchema.PdfInvoiceTemplateSchema>;
    Result: z.infer<typeof JobsSchema.PdfInvoicesSchema.PdfInvoiceResultSchema>;
    State: z.infer<typeof JobsSchema.PdfInvoicesSchema.PdfInvoiceJobStateSchema>;
  };
  Migrations: {
    Payload: z.infer<typeof JobsSchema.MigrationsSchema.MigrationPayloadSchema>;
    Result: z.infer<typeof JobsSchema.MigrationsSchema.MigrationResultSchema>;
    State: z.infer<typeof JobsSchema.MigrationsSchema.MigrationJobStateSchema>;
  };
  PdfCleanup: {
    Payload: z.infer<typeof JobsSchema.PdfCleanupSchema.PdfCleanupPayloadSchema>;
    Result: z.infer<typeof JobsSchema.PdfCleanupSchema.PdfCleanupResultSchema>;
  };
  Common: {
    ScheduledJobs: z.infer<typeof JobsSchema.CommonSchema.ScheduledJobSchema>;
    ScheduledJobState: ScheduledJobState;
  };
}

export type { Jobs, TriggerJobs };
