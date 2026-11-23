import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

export const TemplateContentsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
);

export const GetTemplateContentsResponseSchema = z.strictObject({
  data: z.array(TemplateContentsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetTemplateContentResponseSchema = z.strictObject({
  content: TemplateContentsResponseSchema.nullish(),
});
export const CreateTemplateContentResponseSchema = z.strictObject({
  content: TemplateContentsResponseSchema,
});
export const UpdateTemplateContentResponseSchema = CreateTemplateContentResponseSchema;

export const GetTemplateContentsRequestSchema =
  RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema;
export const CreateTemplateContentRequestSchema =
  RecordsSchema.Core.DocumentsSchema.InsertTemplateContentsSchema;
export const UpdateTemplateContentRequestSchema =
  RecordsSchema.Core.DocumentsSchema.UpdateTemplateContentsSchema;

export const GetTemplateContentsFiltersSchema =
  RecordsSchema.Core.DocumentsSchema.FilterTemplateContentsSchema;
export const GetTemplateContentsFiltersQuerySchema = GetTemplateContentsFiltersSchema;
