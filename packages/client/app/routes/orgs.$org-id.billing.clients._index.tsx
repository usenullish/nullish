import type { Route } from "./+types/orgs.$org-id.billing.clients._index";
import { ClientsServer } from "~/context/server/clients.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterSelect, FilterText, ListFilters } from "~/components/core/list-filters";
import { ClientsTable } from "~/components/billing/clients/list/clients-table";
import { Button } from "~/ui/components/button";
import { ClientType } from "@usenullish/nullish-schema/db";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await ClientsServer.create().listClients(args);
};

const OrganizationClientsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const clients = loaderData?.clients ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="type"
            label={i18n.core.label.type}
            options={Object.values(ClientType).map((value) => ({
              value,
              label: i18n.clients.type[value],
            }))}
          />
          <FilterText name="search" label={i18n.core.label.search} />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={BillingPath.create({ organizationId: organization.id }).to({
                  path: "/clients/new",
                })}
              />
            }
          >
            <Plus />
            {i18n.clients.action.create}
          </Button>
        </WriteGuard>
      </div>

      <ClientsTable clients={clients} />

      <Pagination count={clients.length} />
    </div>
  );
};

export default OrganizationClientsPage;
