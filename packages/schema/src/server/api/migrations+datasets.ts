import * as z from "zod";
import { DateStringCodec } from "@usenullish/nullish-common";
import { ServicesSchema } from "../../services";
import { withAuditFieldsCodecs } from "./_audit";
import { MIGRATION_DATASET_FILE_MAX_SIZE } from "../constants/migration";
import { MigrationDatasetType } from "../../db/constants/migrations";

export const DatasetSchema = withAuditFieldsCodecs(
  ServicesSchema.MigrationSchema.UploadDatasetResultSchema,
);

const UploadFileRequestSchema = z.strictObject({
  file: z.file().max(MIGRATION_DATASET_FILE_MAX_SIZE).meta({ type: "string", format: "binary" }),
});

export const UploadDatasetRequestSchema = z.discriminatedUnion("type", [
  UploadFileRequestSchema.extend({ type: z.literal(MigrationDatasetType.ACCOUNTS) }),
  UploadFileRequestSchema.extend({
    type: z.literal(MigrationDatasetType.BALANCES),
    validOn: DateStringCodec,
  }),
  UploadFileRequestSchema.extend({ type: z.literal(MigrationDatasetType.JOURNAL) }),
  UploadFileRequestSchema.extend({ type: z.literal(MigrationDatasetType.CLIENTS) }),
  UploadFileRequestSchema.extend({ type: z.literal(MigrationDatasetType.INVOICES) }),
]);

export const GetDatasetsResponseSchema = z.strictObject({
  datasets: z.array(DatasetSchema),
});

export const UploadDatasetResponseSchema = z.strictObject({
  dataset: DatasetSchema,
});
