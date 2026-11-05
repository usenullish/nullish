import type { Route } from "./+types/orgs.$org-id.billing.invoices.new";
import { NewInvoice } from "~/components/billing/invoices/new/new-invoice";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { loadVatAndPeriod } from "~/context/loaders/vat-period.loader.server";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) => BillingPath.create({ organizationId }).to({ path: "/invoices" }),
    label: ({ i18n }) => i18n.invoices.action.create,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatAndPeriod(args);
};

const NewInvoicesPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();

  return (
    <NewInvoice
      organizationId={organizationId}
      vatRates={loaderData.rates?.rates ?? []}
      vatMethods={loaderData.methods?.methods ?? []}
      periods={loaderData.periods?.periods ?? []}
    />
  );
};

// /orgs/:orgId/invoices/new
export default NewInvoicesPage;
