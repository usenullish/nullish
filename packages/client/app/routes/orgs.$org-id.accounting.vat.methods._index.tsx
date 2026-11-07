import type { Route } from "./+types/orgs.$org-id.accounting.vat.methods._index";
import { VatMethodSummariesServer } from "~/context/server/vat-method-summaries.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { VatMethodsTable } from "~/components/settings/vat/methods/list/vat-methods-table";
import { Pagination } from "~/components/core/pagination";
import { Button } from "~/ui/components/button";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  const vatMethodSummaries = await VatMethodSummariesServer.create().listVatMethodSummaries(args);

  return { vatMethodSummaries };
};

const OrganizationVatMethodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const vatMethodSummaries = loaderData.vatMethodSummaries?.vatMethodSummaries ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={AccountingPath.create({
                  organizationId: organization.id,
                }).to({ path: "/vat/methods/new" })}
              />
            }
          >
            <Plus />
            {i18n.vat.action.methods_create}
          </Button>
        </WriteGuard>
      </div>

      <VatMethodsTable vatMethodSummaries={vatMethodSummaries} />

      <Pagination count={vatMethodSummaries.length} />
    </div>
  );
};

export default OrganizationVatMethodsPage;
