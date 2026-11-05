import { useOrganization } from "~/context/contexts/organization.context";
import { NewVatSettings } from "~/components/settings/vat/settings/new/new-vat-settings";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/settings" }),
    label: ({ i18n }) => i18n.vat.action.settings_create,
  },
};

const NewVatSettingsPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewVatSettings organizationId={organizationId} />;
};

// /orgs/:orgId/accounting/vat/settings/new
export default NewVatSettingsPage;
