import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { DateCodec, DateStringCodec } from "@usenullish/nullish-common";

const withIssuedCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    issueOn: DateCodec,
    dueOn: DateCodec.nullable(),
  });

const withOptionalIssuedCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    issueOn: DateCodec.optional(),
    dueOn: DateCodec.nullish(),
  });

export const InvoiceSchema = withIssuedCodecs(
  withAuditFieldsCodecs(RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema),
);

export const GetInvoicesResponseSchema = z.strictObject({
  invoices: z.array(InvoiceSchema),
});
export const GetInvoiceResponseSchema = z.strictObject({
  invoice: InvoiceSchema.nullish(),
});
export const CreateInvoiceResponseSchema = z.strictObject({
  invoice: InvoiceSchema,
});
export const UpdateInvoiceResponseSchema = CreateInvoiceResponseSchema;

export const GetInvoicesRequestSchema = withIssuedCodecs(
  RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
);
export const CreateInvoiceRequestSchema = withIssuedCodecs(
  RecordsSchema.Billing.InvoicesSchema.InsertInvoicesSchema,
);

// Invoice can only be updated through /invoices/:id without modifying the status
// Use dedicated functions to switch between statuses e.g. /invoices/:id/open
export const UpdateInvoiceRequestSchema = withOptionalIssuedCodecs(
  RecordsSchema.Billing.InvoicesSchema.UpdateInvoicesSchema.omit({
    status: true,
  }),
);

export const GetInvoicesFiltersSchema =
  RecordsSchema.Billing.InvoicesSchema.FilterInvoicesSchema.extend({
    issueOnFrom: DateCodec.optional(),
    issueOnTo: DateCodec.optional(),
  });
export const GetInvoicesFiltersQuerySchema =
  RecordsSchema.Billing.InvoicesSchema.FilterInvoicesSchema.extend({
    issueOnFrom: DateStringCodec.optional(),
    issueOnTo: DateStringCodec.optional(),
  });
