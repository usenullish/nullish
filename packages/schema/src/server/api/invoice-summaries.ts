import * as z from "zod";
import { BigIntCodec } from "@usenullish/nullish-common";
import { CompositesSchema } from "../../composites";
import { GetInvoicesFiltersQuerySchema, GetInvoicesFiltersSchema, InvoiceSchema } from "./invoices";

const InvoiceTotalsSchema = z.strictObject({
  subtotal: BigIntCodec,
  vat: BigIntCodec,
  total: BigIntCodec,
});

const InvoiceBalanceSchema = z.strictObject({
  paid: BigIntCodec,
  remaining: BigIntCodec,
});

export const InvoiceSummarySchema = z.strictObject({
  invoice: InvoiceSchema,
  client: CompositesSchema.InvoiceSummariesSchema.InvoiceClientSchema,
  amounts: z.strictObject({
    totals: InvoiceTotalsSchema,
    balance: InvoiceBalanceSchema,
  }),
});

export const GetInvoiceSummariesResponseSchema = z.strictObject({
  invoiceSummaries: z.array(InvoiceSummarySchema),
});
export const GetInvoiceSummaryResponseSchema = z.strictObject({
  invoiceSummary: InvoiceSummarySchema.nullish(),
});

export const GetInvoiceSummariesFiltersSchema = GetInvoicesFiltersSchema;
export const GetInvoiceSummariesFiltersQuerySchema = GetInvoicesFiltersQuerySchema;
