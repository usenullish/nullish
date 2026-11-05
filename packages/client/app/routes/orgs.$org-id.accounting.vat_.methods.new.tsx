import type { Route } from "./+types/orgs.$org-id.accounting.vat_.methods.new";
import { useOrganization } from "~/context/contexts/organization.context";
import { VatMethodsServer } from "~/context/server/vat+methods.server";
import { PeriodsServer } from "~/context/server/periods.server";
import { NewVatMethods } from "~/components/settings/vat/methods/new/new-vat-methods";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/methods" }),
    label: ({ i18n }) => i18n.vat.action.methods_create,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [methods, periods] = await Promise.all([
    VatMethodsServer.create().listAllVatMethods(args),
    PeriodsServer.create().listAllPeriods(args),
  ]);

  return { methods, periods };
};

const NewVatMethodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();

  const methods = loaderData.methods?.methods ?? [];

  const periods = (loaderData.periods?.periods ?? [])
    .filter(({ id }) => !methods.some(({ periodId }) => periodId === id))
    .toSorted((a, b) => b.startOn.getTime() - a.startOn.getTime());

  return <NewVatMethods organizationId={organizationId} periods={periods} />;
};

// /orgs/:orgId/accounting/vat/methods/new
export default NewVatMethodsPage;
