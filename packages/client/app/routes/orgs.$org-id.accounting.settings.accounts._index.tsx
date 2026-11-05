import type { Route } from "./+types/orgs.$org-id.accounting.settings.accounts._index";
import { AccountsServer } from "~/context/server/accounts.server";
import { AccountsTable } from "~/components/settings/accounts/list/accounts-table";

export const loader = async (args: Route.LoaderArgs) => {
  return await AccountsServer.create().list(args);
};

const OrganizationAccountsPage = ({ loaderData }: Route.ComponentProps) => (
  <AccountsTable accounts={loaderData?.accounts ?? []} />
);

export default OrganizationAccountsPage;
