import type { LoaderFunctionArgs } from "react-router";
import { AccountsServer } from "~/context/server/accounts.server";
import { AccountingSettingsServer } from "~/context/server/accounting+settings.server";
import { BillingSettingsServer } from "~/context/server/billing+settings.server";
import { ClientsServer } from "~/context/server/clients.server";
import { SubscriptionSummariesServer } from "~/context/server/subscription-summaries.server";

export const loadOrganizationData = async (args: LoaderFunctionArgs) => {
  const [
    accountsResult,
    accountingSettingsResult,
    billingSettingsResult,
    clientsResult,
    subscriptionSummariesResult,
  ] = await Promise.all([
    AccountsServer.create().listAll(args),
    AccountingSettingsServer.create().listAll(args),
    BillingSettingsServer.create().listAll(args),
    ClientsServer.create().listAll(args),
    SubscriptionSummariesServer.create().listAll(args),
  ]);

  return {
    orgId: args.params["org-id"],
    accounts: accountsResult?.data,
    accountingSettings: accountingSettingsResult?.data[0],
    billingSettings: billingSettingsResult?.data[0],
    clients: clientsResult?.data,
    subscriptionSummary: subscriptionSummariesResult?.data[0],
  };
};
