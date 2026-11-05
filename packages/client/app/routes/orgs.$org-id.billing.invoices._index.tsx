import type { Route } from "./+types/orgs.$org-id.billing.invoices._index";
import { InvoiceSummariesServer } from "~/context/server/invoice-summaries.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterDate, FilterSelect, ListFilters } from "~/components/core/list-filters";
import { InvoicesTable } from "~/components/billing/invoices/list/invoices-table";
import { Button } from "~/ui/components/button";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await InvoiceSummariesServer.create().listInvoiceSummaries(args);
};

const OrganizationInvoicesPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const invoices = loaderData?.invoiceSummaries ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="status"
            label={i18n.core.label.status}
            options={Object.values(InvoiceStatus).map((value) => ({
              value,
              label: i18n.invoices.status[value],
            }))}
          />
          <FilterDate name="issueOnFrom" label={i18n.invoices.label.issued_from} />
          <FilterDate name="issueOnTo" label={i18n.invoices.label.issued_to} />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={BillingPath.create({ organizationId: organization.id }).to({
                  path: "/invoices/new",
                })}
              />
            }
          >
            <Plus />
            {i18n.invoices.action.create}
          </Button>
        </WriteGuard>
      </div>

      <InvoicesTable invoices={invoices} />

      <Pagination count={invoices.length} />
    </div>
  );
};

export default OrganizationInvoicesPage;
