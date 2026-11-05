import type { LoaderFunctionArgs } from "react-router";
import { AccountsServer } from "~/context/server/accounts.server";
import { AccountingSettingsServer } from "~/context/server/accounting+settings.server";
import { BillingSettingsServer } from "~/context/server/billing+settings.server";
import { ClientsServer } from "~/context/server/clients.server";

export const loadOrganizationData = async (args: LoaderFunctionArgs) => {
  const [accountsResult, accountingSettingsResult, billingSettingsResult, clientsResult] =
    await Promise.all([
      AccountsServer.create().listAll(args),
      AccountingSettingsServer.create().listAll(args),
      BillingSettingsServer.create().listAll(args),
      ClientsServer.create().listAll(args),
    ]);

  return {
    orgId: args.params["org-id"],
    accounts: accountsResult?.accounts,
    accountingSettings: accountingSettingsResult?.settings[0],
    billingSettings: billingSettingsResult?.settings[0],
    clients: clientsResult?.clients,
  };
};
