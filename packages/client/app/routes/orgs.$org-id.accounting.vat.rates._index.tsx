import type { Route } from "./+types/orgs.$org-id.accounting.vat.rates._index";
import { VatRatesServer } from "~/context/server/vat+rates.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterDate, FilterSelect, ListFilters } from "~/components/core/list-filters";
import { VatType } from "@usenullish/nullish-schema/db";
import { VatRatesTable } from "~/components/settings/vat/rates/list/vat-rates-table";
import { Button } from "~/ui/components/button";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await VatRatesServer.create().listVatRates(args);
};

const OrganizationVatRatesPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const rates = loaderData?.rates ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="type"
            label={i18n.core.label.type}
            options={Object.values(VatType).map((value) => ({
              value,
              label: i18n.vat.type[value],
            }))}
          />
          <FilterDate name="validOn" label={i18n.core.label.valid_on} />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={AccountingPath.create({
                  organizationId: organization.id,
                }).to({ path: "/vat/rates/new" })}
              />
            }
          >
            <Plus />
            {i18n.vat.action.rate_create}
          </Button>
        </WriteGuard>
      </div>

      <VatRatesTable rates={rates} />

      <Pagination count={rates.length} />
    </div>
  );
};

export default OrganizationVatRatesPage;
