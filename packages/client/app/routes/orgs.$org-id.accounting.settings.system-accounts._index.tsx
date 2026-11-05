import type { Route } from "./+types/orgs.$org-id.accounting.settings.system-accounts._index";
import { SystemAccountsServer } from "~/context/server/accounts-system.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterSelect, ListFilters } from "~/components/core/list-filters";
import { AccountsSystemTable } from "~/components/settings/accounts-system/list/accounts-system-table";
import { Button } from "~/ui/components/button";
import { SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await SystemAccountsServer.create().listSystemAccounts(args);
};

const OrganizationSystemAccountsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const accounts = loaderData?.accounts ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="purpose"
            label={i18n.core.label.purpose}
            options={Object.values(SystemAccountPurpose).map((value) => ({
              value,
              label: i18n.system_accounts.purpose[value],
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
                }).toSettings({ path: "/system-accounts/new" })}
              />
            }
          >
            <Plus />
            {i18n.system_accounts.action.create}
          </Button>
        </WriteGuard>
      </div>

      <AccountsSystemTable accounts={accounts} />

      <Pagination count={accounts.length} />
    </div>
  );
};

export default OrganizationSystemAccountsPage;
