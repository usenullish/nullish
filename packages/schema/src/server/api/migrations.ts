import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";

export const MigrationSchema = withAuditFieldsCodecs(
  RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
);

export const GetMigrationsResponseSchema = z.strictObject({
  data: z.array(MigrationSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetMigrationResponseSchema = z.strictObject({
  migration: MigrationSchema.nullish(),
});

export const CreateMigrationRequestSchema =
  RecordsSchema.Migration.MigrationsSchema.InsertMigrationsSchema;
export const CreateMigrationResponseSchema = z.strictObject({
  migration: MigrationSchema,
});
