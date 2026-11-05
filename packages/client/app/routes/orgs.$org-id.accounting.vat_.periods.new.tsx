import { useOrganization } from "~/context/contexts/organization.context";
import { NewVatPeriods } from "~/components/settings/vat/periods/new/new-vat-periods";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/periods" }),
    label: ({ i18n }) => i18n.vat.action.period_create,
  },
};

const NewVatPeriodsPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewVatPeriods organizationId={organizationId} />;
};

// /orgs/:orgId/accounting/vat/periods/new
export default NewVatPeriodsPage;
