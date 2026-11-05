import type { Route } from "./+types/orgs.$org-id.migrations._index";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { MigrationsServer } from "~/context/server/migrations.server";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { MigrationsTable } from "~/components/settings/migrations/list/migrations-table";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { Button } from "~/ui/components/button";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await MigrationsServer.create().listMigrations(args);
};

const OrganizationMigrationsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const migrations = loaderData?.migrations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={OrganizationPath.create({ organizationId: organization.id }).to({
                  path: "/migrations/new",
                })}
              />
            }
          >
            <Plus />
            {i18n.migrations.action.create}
          </Button>
        </WriteGuard>
      </div>

      <MigrationsTable migrations={migrations} />

      <Pagination count={migrations.length} />
    </div>
  );
};

// /orgs/:orgId/migrations
export default OrganizationMigrationsPage;
