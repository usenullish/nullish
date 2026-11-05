import type { Route } from "./+types/orgs.$org-id.accounting.settings_.periods.$id";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { PeriodEdit } from "~/components/settings/periods/edit/period-edit";
import { useOrganization } from "~/context/contexts/organization.context";
import { PeriodsServer } from "~/context/server/periods.server";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/periods" }),
    label: ({ i18n }) => i18n.periods.text.edit,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await PeriodsServer.create().getPeriod(args);
};

const PeriodPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { period } = loaderData ?? { period: undefined };

  if (isNullish(period)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <PeriodEdit organizationId={organizationId} period={period} />;
};

// /orgs/:orgId/accounting/settings/periods/:id
export default PeriodPage;
