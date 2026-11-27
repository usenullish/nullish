import * as z from "zod";
import { JobsSchema } from "../../jobs";

export const GenerateExportResponseSchema = z.strictObject({
  status: z.literal("queued"),
  ...JobsSchema.CommonSchema.ScheduledJobSchema.shape,
});

export const ExportJobStateResponseSchema = JobsSchema.ExportsSchema.ExportJobStateSchema;
