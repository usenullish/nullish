import * as z from "zod";
import { JobsSchema } from "../../jobs";
import { StorageSchema } from "../../storage";

export const ExportJobStateArgsSchema = z.strictObject({
  ...JobsSchema.CommonSchema.ScheduledJobSchema.shape,
});

export const ExportJobStateResultSchema = JobsSchema.ExportsSchema.ExportJobStateSchema;

export const ExportStreamArgsSchema = z.strictObject({
  ...JobsSchema.ExportsSchema.ExportResultSchema.shape,
});

export const ExportStreamResultSchema = z.strictObject({
  ...StorageSchema.StorageGetResultSchema.shape,
});
