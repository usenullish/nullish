import type { Route } from "./+types/orgs.$org-id.accounting.vat.methods._index";
import { VatMethodsServer } from "~/context/server/vat+methods.server";
import { PeriodsServer } from "~/context/server/periods.server";
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
  const [methods, periods] = await Promise.all([
    VatMethodsServer.create().listVatMethods(args),
    PeriodsServer.create().listAllPeriods(args),
  ]);

  return { methods, periods };
};

const OrganizationVatMethodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const methods = loaderData.methods?.methods ?? [];
  const periods = loaderData.periods?.periods ?? [];

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

      <VatMethodsTable methods={methods} periods={periods} />

      <Pagination count={methods.length} />
    </div>
  );
};

export default OrganizationVatMethodsPage;
