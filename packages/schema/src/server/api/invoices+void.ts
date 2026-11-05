import { ServicesSchema } from "../../services";
import { CreateInvoiceResponseSchema } from "./invoices";
import { DateCodec } from "@usenullish/nullish-common";

export const VoidInvoiceRequestSchema = ServicesSchema.InvoicesSchema.VoidInvoiceArgsSchema.extend({
  validOn: DateCodec.nullable(),
});

export const VoidInvoiceResponseSchema = CreateInvoiceResponseSchema;
