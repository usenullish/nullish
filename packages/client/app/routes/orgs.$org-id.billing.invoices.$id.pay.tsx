import type { Route } from "./+types/orgs.$org-id.billing.invoices.$id.pay";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { PayInvoice } from "~/components/billing/invoices/form/pay-invoice";
import { useInvoice } from "~/context/contexts/invoice.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/invoices/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.invoices.text.pay_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const bankRelations = await BankRelationsServer.create().listAllBankRelations(args);

  return { bankRelations };
};

const PayInvoicePage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { id: invoiceId, currency } = useInvoice();

  return (
    <PayInvoice
      organizationId={organizationId}
      invoiceId={invoiceId}
      currency={currency}
      bankRelations={loaderData.bankRelations?.bankRelations ?? []}
    />
  );
};

// /orgs/:orgId/invoices/$id/pay
export default PayInvoicePage;
