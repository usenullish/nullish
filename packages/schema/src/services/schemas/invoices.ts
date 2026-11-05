import * as z from "zod";
import { RecordsSchema } from "../../records";
import { JobsSchema } from "../../jobs";
import { StorageSchema } from "../../storage";
import { refineExchangeRate } from "../../db/_refine";

// TODO: Update currency and exchangeRate interface with a tupple enum for CHF?
export const PayInvoiceArgsSchema = z.strictObject({
  amount: z.bigint().gt(0n),
  currency: z.string().max(20),
  exchangeRate: refineExchangeRate.gt(0).default(1),
  validOn: z.date().nullable(),
  bankRelationId: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema.shape.id
    .nullish()
    .describe(
      "The bank relation the payment was received on, one of the organization of the invoice. Without it, the payment is booked on the bank_account system account",
    ),
});

export const VoidInvoiceArgsSchema = z.strictObject({
  validOn: z.date().nullable(),
});

export const UncollectibleInvoiceArgsSchema = z.strictObject({
  validOn: z.date().nullable(),
});

export const GeneratePdfInvoiceArgsSchema = z.strictObject({
  template: JobsSchema.PdfInvoicesSchema.PdfInvoiceTemplateSchema,
  bankRelationId: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema.shape.id
    .nullish()
    .describe("The bank relation printed on the document, one of the organization of the invoice"),
});

export const PdfInvoiceJobStateArgsSchema = z.strictObject({
  ...JobsSchema.CommonSchema.ScheduledJobSchema.shape,
});

export const PdfInvoiceJobStateResultSchema = JobsSchema.PdfInvoicesSchema.PdfInvoiceJobStateSchema;

export const PdfInvoiceStreamArgsSchema = z.strictObject({
  ...JobsSchema.PdfInvoicesSchema.PdfInvoiceResultSchema.shape,
});

export const PdfInvoiceStreamResultSchema = z.strictObject({
  ...StorageSchema.StorageGetResultSchema.shape,
});
