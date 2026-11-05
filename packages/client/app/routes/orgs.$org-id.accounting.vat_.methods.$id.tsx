import type { Route } from "./+types/orgs.$org-id.accounting.vat_.methods.$id";
import { useOrganization } from "~/context/contexts/organization.context";
import { VatMethodsServer } from "~/context/server/vat+methods.server";
import { PeriodsServer } from "~/context/server/periods.server";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { VatMethodEdit } from "~/components/settings/vat/methods/edit/vat-method-edit";
import type { RouteHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/vat/methods" }),
    label: ({ i18n }) => i18n.vat.text.method_edit,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [method, periods] = await Promise.all([
    VatMethodsServer.create().getVatMethod(args),
    PeriodsServer.create().listAllPeriods(args),
  ]);

  return { method, periods };
};

const VatMethodPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const method = loaderData.method?.method;
  const periods = loaderData.periods?.periods ?? [];

  if (isNullish(method)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <VatMethodEdit organizationId={organizationId} method={method} periods={periods} />;
};

// /orgs/:orgId/accounting/vat/methods/:id
export default VatMethodPage;
