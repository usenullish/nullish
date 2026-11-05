import { NewLine } from "~/components/billing/invoices/new/new-line";
import { useInvoice } from "~/context/contexts/invoice.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/invoices/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.lines.action.create,
  },
};

const NewLinesPage = () => {
  const { id: organizationId } = useOrganization();
  const { id: invoiceId, currency } = useInvoice();

  return <NewLine organizationId={organizationId} invoiceId={invoiceId} currency={currency} />;
};

// /orgs/:orgId/invoices/$id/new
export default NewLinesPage;
