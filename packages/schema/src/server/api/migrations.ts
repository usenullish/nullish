import * as z from "zod";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";

export const MigrationSchema = withAuditFieldsCodecs(
  RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
);

export const GetMigrationsResponseSchema = z.strictObject({
  migrations: z.array(MigrationSchema),
});
export const GetMigrationResponseSchema = z.strictObject({
  migration: MigrationSchema.nullish(),
});

export const CreateMigrationRequestSchema =
  RecordsSchema.Migration.MigrationsSchema.InsertMigrationsSchema;
export const CreateMigrationResponseSchema = z.strictObject({
  migration: MigrationSchema,
});
