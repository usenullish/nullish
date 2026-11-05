import { BigIntCodec, DateCodec } from "@usenullish/nullish-common";
import { ServicesSchema } from "../../services";
import { CreateInvoiceResponseSchema } from "./invoices";

export const PayInvoiceRequestSchema = ServicesSchema.InvoicesSchema.PayInvoiceArgsSchema.extend({
  amount: BigIntCodec,
  validOn: DateCodec.nullable(),
});

export const PayInvoiceResponseSchema = CreateInvoiceResponseSchema;
