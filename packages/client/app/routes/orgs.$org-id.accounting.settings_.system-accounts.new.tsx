import { NewAccountsSystem } from "~/components/settings/accounts-system/new/new-accounts-system";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/system-accounts" }),
    label: ({ i18n }) => i18n.system_accounts.text.create_title,
  },
};

const NewAccountsSystemsPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewAccountsSystem organizationId={organizationId} />;
};

// /orgs/:orgId/accounting/settings/system-accounts/new
export default NewAccountsSystemsPage;
