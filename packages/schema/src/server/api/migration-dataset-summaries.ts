import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { CompositesSchema } from "../../composites";
import { DatasetSchema } from "./migrations+datasets";
import { MigrationSchema } from "./migrations";

export const DatasetSummarySchema = z.strictObject({
  dataset: DatasetSchema,
  migration: MigrationSchema,
});

export const GetDatasetSummariesResponseSchema = z.strictObject({
  data: z.array(DatasetSummarySchema),
  pagination: PaginationResponseSchema.optional(),
});

export const GetDatasetSummariesFiltersSchema =
  CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema;
export const GetDatasetSummariesFiltersQuerySchema =
  CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema;
