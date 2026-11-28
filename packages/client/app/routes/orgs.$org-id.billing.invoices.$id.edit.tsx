import { Navigate } from "react-router";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import type { Route } from "./+types/orgs.$org-id.billing.invoices.$id.edit";
import { InvoiceEdit } from "~/components/billing/invoices/edit/invoice-edit";
import { useInvoice } from "~/context/contexts/invoice.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { loadVatAndPeriod } from "~/context/loaders/vat-period.loader.server";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/invoices/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.invoices.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatAndPeriod(args);
};

const InvoiceEditPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const invoice = useInvoice();

  if (invoice.status !== InvoiceStatus.DRAFT) {
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).to({ path: `/invoices/${invoice.id}` })}
        replace
      />
    );
  }

  return (
    <InvoiceEdit
      organizationId={organizationId}
      invoice={invoice}
      vatRates={loaderData.rates?.data ?? []}
      vatMethods={loaderData.methods?.data ?? []}
      periods={loaderData.periods?.data ?? []}
    />
  );
};

// /orgs/:orgId/invoices/:id/edit
export default InvoiceEditPage;
