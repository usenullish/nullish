import { NewAccount } from "~/components/settings/accounts/new/new-account";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/accounts" }),
    label: ({ i18n }) => i18n.accounts.text.create_title,
  },
};

const NewAccountPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewAccount organizationId={organizationId} />;
};

// /orgs/:orgId/accounting/settings/accounts/new
export default NewAccountPage;
