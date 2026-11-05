import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  DocumentTemplatesSchema,
  TemplateContentsSchema,
} from "../../../db/schemas/core/documents";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import { DocumentType } from "../../../db";
import * as z from "zod";
import { LanguageCodeSchema } from "../_language";

// Drizzle does not correctly infer the enum
const refineDocumentTypesEnums = {
  type: z.enum(DocumentType),
};

export const SelectDocumentTemplatesSchema = createSelectSchema(
  DocumentTemplatesSchema,
  refineDocumentTypesEnums,
);
export const InsertDocumentTemplatesSchema = createInsertSchema(
  DocumentTemplatesSchema,
  refineDocumentTypesEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateDocumentTemplatesSchema = createUpdateSchema(
  DocumentTemplatesSchema,
  refineDocumentTypesEnums,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterDocumentTemplatesSchema = z.strictObject({
  type: refineDocumentTypesEnums.type.optional(),
});

export const SelectTemplateContentsSchema = createSelectSchema(TemplateContentsSchema).omit(
  ORGANIZATION_ID_OMIT_FIELD,
);
export const InsertTemplateContentsSchema = createInsertSchema(TemplateContentsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
    templateId: true,
  })
  .extend({
    language: LanguageCodeSchema,
  });
export const UpdateTemplateContentsSchema = createUpdateSchema(TemplateContentsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    templateId: true,
  })
  .extend({
    language: LanguageCodeSchema.optional(),
  })
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterTemplateContentsSchema = z.strictObject({
  language: LanguageCodeSchema.optional(),
});
