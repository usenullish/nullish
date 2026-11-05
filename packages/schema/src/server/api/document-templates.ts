import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const DocumentTemplatesResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
);

export const GetDocumentTemplatesResponseSchema = z.strictObject({
  templates: z.array(DocumentTemplatesResponseSchema),
});
export const GetDocumentTemplateResponseSchema = z.strictObject({
  template: DocumentTemplatesResponseSchema.nullish(),
});
export const CreateDocumentTemplateResponseSchema = z.strictObject({
  template: DocumentTemplatesResponseSchema,
});
export const UpdateDocumentTemplateResponseSchema = CreateDocumentTemplateResponseSchema;

export const GetDocumentTemplatesRequestSchema =
  RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema;
export const CreateDocumentTemplateRequestSchema =
  RecordsSchema.Core.DocumentsSchema.InsertDocumentTemplatesSchema;
export const UpdateDocumentTemplateRequestSchema =
  RecordsSchema.Core.DocumentsSchema.UpdateDocumentTemplatesSchema;

export const GetDocumentTemplatesFiltersSchema =
  RecordsSchema.Core.DocumentsSchema.FilterDocumentTemplatesSchema;
export const GetDocumentTemplatesFiltersQuerySchema = GetDocumentTemplatesFiltersSchema;
