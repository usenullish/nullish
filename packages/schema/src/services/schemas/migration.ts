import * as z from "zod";
import { MigrationDatasetType } from "../../db/constants/migrations";
import {
  InsertDatasetsSchema,
  SelectDatasetsSchema,
} from "../../records/schemas/migration/datasets";
import { ForeignOpeningBalancesSchema } from "../../migration/schemas/foreign";

const UploadFileArgsSchema = z.strictObject({
  file: z.instanceof(Uint8Array),
  name: InsertDatasetsSchema.shape.name,
});

export const UploadDatasetArgsSchema = z.discriminatedUnion("type", [
  UploadFileArgsSchema.extend({ type: z.literal(MigrationDatasetType.ACCOUNTS) }),
  UploadFileArgsSchema.extend({
    type: z.literal(MigrationDatasetType.BALANCES),
    validOn: ForeignOpeningBalancesSchema.shape.validOn,
  }),
  UploadFileArgsSchema.extend({ type: z.literal(MigrationDatasetType.JOURNAL) }),
  UploadFileArgsSchema.extend({ type: z.literal(MigrationDatasetType.CLIENTS) }),
  UploadFileArgsSchema.extend({ type: z.literal(MigrationDatasetType.INVOICES) }),
]);

export const UploadDatasetResultSchema = SelectDatasetsSchema.omit({ data: true });
