import type { Route } from "./+types/orgs.$org-id.accounting.vat.periods._index";
import { VatPeriodsServer } from "~/context/server/vat+periods.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterSelect, ListFilters } from "~/components/core/list-filters";
import { VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { VatPeriodsTable } from "~/components/settings/vat/periods/list/vat-periods-table";
import { Button } from "~/ui/components/button";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await VatPeriodsServer.create().listVatPeriods(args);
};

const OrganizationVatPeriodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const periods = loaderData?.periods ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="status"
            label={i18n.core.label.status}
            options={Object.values(VatPeriodStatus).map((value) => ({
              value,
              label: i18n.core.status[value],
            }))}
          />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={AccountingPath.create({
                  organizationId: organization.id,
                }).to({ path: "/vat/periods/new" })}
              />
            }
          >
            <Plus />
            {i18n.vat.action.period_create}
          </Button>
        </WriteGuard>
      </div>

      <VatPeriodsTable periods={periods} />

      <Pagination count={periods.length} />
    </div>
  );
};

export default OrganizationVatPeriodsPage;
