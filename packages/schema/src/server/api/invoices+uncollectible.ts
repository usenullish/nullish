import { ServicesSchema } from "../../services";
import { CreateInvoiceResponseSchema } from "./invoices";
import { DateCodec } from "@usenullish/nullish-common";

export const UncollectibleInvoiceRequestSchema =
  ServicesSchema.InvoicesSchema.UncollectibleInvoiceArgsSchema.extend({
    validOn: DateCodec.nullable(),
  });

export const UncollectibleInvoiceResponseSchema = CreateInvoiceResponseSchema;
