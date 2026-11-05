import type { Route } from "./+types/orgs.$org-id.accounting.settings_.periods.new";
import { NewPeriod } from "~/components/settings/periods/new/new-period";
import { useOrganization } from "~/context/contexts/organization.context";
import { PeriodsServer } from "~/context/server/periods.server";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).toSettings({ path: "/periods" }),
    label: ({ i18n }) => i18n.periods.action.create,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await PeriodsServer.create().listPeriods(args);
};

const NewPeriodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();

  return <NewPeriod organizationId={organizationId} lastPeriod={loaderData?.periods[0]} />;
};

// /orgs/:orgId/accounting/settings/periods/new
export default NewPeriodsPage;
