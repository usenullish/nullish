import * as z from "zod";
import { SelectMigrationsSchema } from "../../records/schemas/migration/migrations";
import { EmptyJobResultSchema, JobPayloadSchema } from "./common";
import { createScheduledJobStateSchema } from "../_builders";

export const MigrationPayloadSchema = z.strictObject({
  ...JobPayloadSchema.shape,
  migrationId: SelectMigrationsSchema.shape.id,
});

export const MigrationResultSchema = EmptyJobResultSchema;

export const MigrationJobStateSchema = createScheduledJobStateSchema({
  schema: MigrationResultSchema,
});
