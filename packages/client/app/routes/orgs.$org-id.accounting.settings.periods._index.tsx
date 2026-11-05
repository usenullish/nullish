import type { Route } from "./+types/orgs.$org-id.accounting.settings.periods._index";
import { PeriodsServer } from "~/context/server/periods.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { PeriodsTable } from "~/components/settings/periods/list/periods-table";
import { Pagination } from "~/components/core/pagination";
import { Button } from "~/ui/components/button";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await PeriodsServer.create().listPeriods(args);
};

const OrganizationPeriodsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const periods = loaderData?.periods ?? [];

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
                }).toSettings({ path: "/periods/new" })}
              />
            }
          >
            <Plus />
            {i18n.periods.action.create}
          </Button>
        </WriteGuard>
      </div>

      <PeriodsTable periods={periods} />

      <Pagination count={periods.length} />
    </div>
  );
};

export default OrganizationPeriodsPage;
