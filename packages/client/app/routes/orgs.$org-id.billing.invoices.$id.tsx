import type { Route } from "./+types/orgs.$org-id.billing.invoices.$id";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate, Outlet } from "react-router";
import {
  NonNullishInvoiceAmountsContext,
  NonNullishInvoiceContext,
} from "~/context/contexts/invoice.context";
import { InvoiceSummariesServer } from "~/context/server/invoice-summaries.server";
import { useOrganization } from "~/context/contexts/organization.context";

export const loader = async (args: Route.LoaderArgs) => {
  return InvoiceSummariesServer.create().getInvoiceSummary(args);
};

// TODO: create guard component?
const InvoicePage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const { invoiceSummary } = loaderData ?? { invoiceSummary: undefined };

  if (isNullish(invoiceSummary)) {
    return <Navigate to={`/orgs/${organization.id}`} replace />;
  }

  return (
    <NonNullishInvoiceContext.Provider value={invoiceSummary.invoice}>
      <NonNullishInvoiceAmountsContext.Provider value={invoiceSummary.amounts}>
        <Outlet />
      </NonNullishInvoiceAmountsContext.Provider>
    </NonNullishInvoiceContext.Provider>
  );
};

export default InvoicePage;
