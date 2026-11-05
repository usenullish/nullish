import { useOrganization } from "~/context/contexts/organization.context";
import type { Route } from "./+types/orgs.$org-id.accounting.settings_.accounts.$id";
import { AccountsServer } from "~/context/server/accounts.server";
import { AccountEdit } from "~/components/settings/accounts/edit/account-edit";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/accounts" }),
    label: ({ i18n }) => i18n.accounts.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return AccountsServer.create().getAccount(args);
};

const AccountPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { account } = loaderData ?? { account: undefined };

  if (isNullish(account)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <AccountEdit organizationId={organizationId} account={account} />;
};

// /orgs/:orgId/accounting/settings/accounts/:id
export default AccountPage;
