import * as z from "zod";
import { RecordsSchema } from "../../records";

export const InvoiceTotalsSchema = z.strictObject({
  subtotal: z.bigint(),
  vat: z.bigint(),
  total: z.bigint(),
});

export const InvoiceBalanceSchema = z.strictObject({
  paid: z.bigint(),
  remaining: z.bigint(),
});

export const InvoiceAmountsSchema = z.strictObject({
  totals: InvoiceTotalsSchema,
  balance: InvoiceBalanceSchema,
});

export const InvoiceClientSchema = RecordsSchema.Billing.ClientsSchema.SelectClientsSchema.pick({
  name: true,
});

export const SelectInvoiceSummariesSchema = z.strictObject({
  invoice: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
  client: InvoiceClientSchema,
  amounts: InvoiceAmountsSchema,
});

export const FilterInvoiceSummariesSchema =
  RecordsSchema.Billing.InvoicesSchema.FilterInvoicesSchema;
