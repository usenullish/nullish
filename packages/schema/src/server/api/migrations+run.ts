import * as z from "zod";
import { JobsSchema } from "../../jobs";

export const RunMigrationJobStateResponseSchema =
  JobsSchema.MigrationsSchema.MigrationJobStateSchema;

export const RunMigrationResponseSchema = z.strictObject({
  status: z.literal("queued"),
  ...JobsSchema.CommonSchema.ScheduledJobSchema.shape,
});
