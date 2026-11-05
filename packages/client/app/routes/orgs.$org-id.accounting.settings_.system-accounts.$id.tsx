import { useOrganization } from "~/context/contexts/organization.context";
import type { Route } from "../../.react-router/types/app/routes/+types/orgs.$org-id.accounting.settings_.system-accounts.$id";
import { SystemAccountsServer } from "~/context/server/accounts-system.server";
import { AccountsSystemEdit } from "~/components/settings/accounts-system/edit/accounts-system-edit";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/system-accounts" }),
    label: ({ i18n }) => i18n.system_accounts.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return SystemAccountsServer.create().getSystemAccount(args);
};

const SystemAccountPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { account } = loaderData ?? { account: undefined };

  if (isNullish(account)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <AccountsSystemEdit organizationId={organizationId} account={account} />;
};

// /orgs/:orgId/accounting/settings/system-accounts/:id
export default SystemAccountPage;
