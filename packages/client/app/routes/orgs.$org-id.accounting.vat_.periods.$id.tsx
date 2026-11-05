import { useOrganization } from "~/context/contexts/organization.context";
import type { Route } from "../../.react-router/types/app/routes/+types/orgs.$org-id.accounting.vat_.periods.$id";
import { VatPeriodsServer } from "~/context/server/vat+periods.server";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { VatPeriodEdit } from "~/components/settings/vat/periods/edit/vat-period-edit";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/periods" }),
    label: ({ i18n }) => i18n.vat.text.period_edit,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return VatPeriodsServer.create().getVatPeriod(args);
};

const VatPeriodPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { period } = loaderData ?? { period: undefined };

  if (isNullish(period)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <VatPeriodEdit organizationId={organizationId} period={period} />;
};

// /orgs/:orgId/accounting/vat/periods/:id
export default VatPeriodPage;
