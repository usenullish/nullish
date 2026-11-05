import * as z from "zod";
import { JobsSchema } from "../../jobs";
import { ServicesSchema } from "../../services";

export const GeneratePdfInvoiceRequestSchema =
  ServicesSchema.InvoicesSchema.GeneratePdfInvoiceArgsSchema;

export const PdfInvoiceResponseSchema = z.strictObject({
  status: z.literal("queued"),
  ...JobsSchema.CommonSchema.ScheduledJobSchema.shape,
});

export const PdfInvoiceJobStateResponseSchema =
  JobsSchema.PdfInvoicesSchema.PdfInvoiceJobStateSchema;
