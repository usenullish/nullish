import { useOrganization } from "~/context/contexts/organization.context";
import type { Route } from "../../.react-router/types/app/routes/+types/orgs.$org-id.accounting.vat_.rates.$id";
import { VatRatesServer } from "~/context/server/vat+rates.server";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { VatRateEdit } from "~/components/settings/vat/rates/edit/vat-rate-edit";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/rates" }),
    label: ({ i18n }) => i18n.vat.text.rate_edit,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return VatRatesServer.create().getVatRate(args);
};

const VatRatePage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { rate } = loaderData ?? { rate: undefined };

  if (isNullish(rate)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <VatRateEdit organizationId={organizationId} rate={rate} />;
};

// /orgs/:orgId/accounting/vat/rates/:id
export default VatRatePage;
