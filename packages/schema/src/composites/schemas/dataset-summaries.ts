import * as z from "zod";
import { RecordsSchema } from "../../records";

export const SelectDatasetSummariesSchema = z.strictObject({
  dataset: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema.omit({ data: true }),
  migration: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
});

export const FilterDatasetSummariesSchema = z.strictObject({
  type: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema.shape.type.optional(),
  status: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema.shape.status.optional(),
});
