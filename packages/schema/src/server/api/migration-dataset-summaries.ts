import * as z from "zod";
import { CompositesSchema } from "../../composites";
import { DatasetSchema } from "./migrations+datasets";
import { MigrationSchema } from "./migrations";

export const DatasetSummarySchema = z.strictObject({
  dataset: DatasetSchema,
  migration: MigrationSchema,
});

export const GetDatasetSummariesResponseSchema = z.strictObject({
  datasetSummaries: z.array(DatasetSummarySchema),
});

export const GetDatasetSummariesFiltersSchema =
  CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema;
export const GetDatasetSummariesFiltersQuerySchema =
  CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema;
