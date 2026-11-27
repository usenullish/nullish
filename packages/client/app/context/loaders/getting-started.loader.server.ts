import type { LoaderFunctionArgs } from "react-router";
import { isArrayAtLeastOne, nonNullish } from "@usenullish/nullish-common";
import { ClientsServer } from "~/context/server/clients.server";
import { InvoiceSummariesServer } from "~/context/server/invoice-summaries.server";
import { BankRelationSummariesServer } from "~/context/server/bank-relation-summaries.server";

export const loadGettingStarted = async (args: LoaderFunctionArgs) => {
  const [clients, invoices, bankRelations] = await Promise.all([
    ClientsServer.create().listOne(args),
    InvoiceSummariesServer.create().listOne(args),
    BankRelationSummariesServer.create().listBankRelationSummaries(args),
  ]);

  return {
    hasClients: isArrayAtLeastOne(clients?.data ?? []),
    hasInvoices: isArrayAtLeastOne(invoices?.data ?? []),
    hasBankRelations: isArrayAtLeastOne(bankRelations?.data ?? []),
    hasStatements: bankRelations?.data.some(({ balance }) => nonNullish(balance)) ?? false,
  };
};

export type GettingStarted = Awaited<ReturnType<typeof loadGettingStarted>>;
