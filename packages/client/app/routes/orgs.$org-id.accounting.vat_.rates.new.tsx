import { useOrganization } from "~/context/contexts/organization.context";
import { NewVatRates } from "~/components/settings/vat/rates/new/new-vat-rates";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/rates" }),
    label: ({ i18n }) => i18n.vat.action.rate_create,
  },
};

const NewVatRatesPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewVatRates organizationId={organizationId} />;
};

// /orgs/:orgId/accounting/vat/settings/new
export default NewVatRatesPage;
