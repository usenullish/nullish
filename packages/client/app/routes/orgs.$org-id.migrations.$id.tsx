import type { Route } from "./+types/orgs.$org-id.migrations.$id";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { MigrationsServer } from "~/context/server/migrations.server";
import { useOrganization } from "~/context/contexts/organization.context";
import { MigrationDetails } from "~/components/settings/migrations/details/migration-details";
import { OrganizationPath } from "~/navigation";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) =>
      OrganizationPath.create({ organizationId }).to({ path: "/migrations" }),
    label: ({ i18n }) => i18n.migrations.text.details,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [migration, datasets] = await Promise.all([
    MigrationsServer.create().getMigration(args),
    MigrationsServer.create().listDatasets(args),
  ]);

  return { migration, datasets };
};

const MigrationDetailsPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();

  const migration = loaderData.migration?.migration;
  const datasets = loaderData.datasets?.datasets ?? [];

  if (isNullish(migration)) {
    return (
      <Navigate
        to={OrganizationPath.create({ organizationId: organization.id }).to({
          path: "/migrations",
        })}
        replace
      />
    );
  }

  return <MigrationDetails migration={migration} datasets={datasets} />;
};

// /orgs/:orgId/migrations/:id
export default MigrationDetailsPage;
