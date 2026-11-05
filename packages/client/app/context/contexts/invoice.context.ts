import { createContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const NonNullishInvoiceContext =
  createContext<Option<Api["Invoices"]["Client"]["Invoice"]>>(undefined);

export const useInvoice = () => {
  const invoice = useContext(NonNullishInvoiceContext);
  assertNonNullish(invoice);
  return invoice;
};

export const NonNullishInvoiceAmountsContext =
  createContext<Option<Api["InvoiceSummaries"]["Client"]["InvoiceSummary"]["amounts"]>>(undefined);

export const useInvoiceAmounts = () => {
  const amounts = useContext(NonNullishInvoiceAmountsContext);
  assertNonNullish(amounts);
  return amounts;
};
