import * as z from "zod";
import { SelectInvoicesSchema } from "../../records/schemas/billing/invoices";
import { SelectTemplateContentsSchema } from "../../records/schemas/core/documents";
import { SelectBankRelationsSchema } from "../../records/schemas/core/bank";
import { JobPayloadSchema } from "./common";
import { createScheduledJobStateSchema } from "../_builders";
import { DefaultTemplateLanguage } from "../../db/constants/documents";

export const PdfInvoiceTemplateSchema = z
  .discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("custom"),
      id: SelectTemplateContentsSchema.shape.id.describe(
        "The ID of the document template content to print, which sets the template and the language of the document",
      ),
    }),
    z.strictObject({
      type: z.literal("default"),
      language: z
        .enum(DefaultTemplateLanguage)
        .describe("The language of the default template provided by Nullish"),
    }),
  ])
  .describe(
    "The template to print: a template content of the organization, or the default template in a language",
  );

export const PdfInvoicePayloadSchema = z.strictObject({
  ...JobPayloadSchema.shape,
  invoiceId: SelectInvoicesSchema.shape.id,
  template: PdfInvoiceTemplateSchema,
  bankRelationId: SelectBankRelationsSchema.shape.id.nullish(),
});

export const PdfInvoiceResultSchema = z.strictObject({
  documentId: z.uuid(),
});

export const PdfInvoiceJobStateSchema = createScheduledJobStateSchema({
  schema: PdfInvoiceResultSchema,
});
