import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiInvoicesGetByIdArgs {
  id: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export interface ApiWithInvoiceIdArgs {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}
