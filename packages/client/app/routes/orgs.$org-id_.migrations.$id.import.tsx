import type { Route } from "./+types/orgs.$org-id_.migrations.$id.import";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { MigrationWizard } from "~/components/settings/migrations/wizard/migration-wizard";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { MigrationsServer } from "~/context/server/migrations.server";
import { MigrationDatasetSummariesServer } from "~/context/server/migration-dataset-summaries.server";
import { OrganizationPath } from "~/navigation";

export const loader = async (args: Route.LoaderArgs) => {
  const [migration, datasets, alreadyImportedDatasets] = await Promise.all([
    MigrationsServer.create().getMigration(args),
    MigrationsServer.create().listDatasets(args),
    MigrationDatasetSummariesServer.create().listAlreadyImportedDatasets(args),
  ]);

  return { migration, datasets, alreadyImportedDatasets };
};

// /orgs/:orgId/migrations/:id/import
const MigrationPage = ({ loaderData, params }: Route.ComponentProps) => {
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  const migration = loaderData?.migration?.migration;
  const datasets = loaderData?.datasets?.datasets ?? [];
  const alreadyImportedDatasets = loaderData?.alreadyImportedDatasets?.datasetSummaries ?? [];

  if (isNullish(organization)) {
    return <Navigate to="/orgs" replace />;
  }

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

  return (
    <NonNullishOrganizationContext.Provider value={organization}>
      <MigrationWizard
        organizationId={organization.id}
        migration={migration}
        datasets={datasets}
        alreadyImportedDatasets={alreadyImportedDatasets}
      />
    </NonNullishOrganizationContext.Provider>
  );
};

export default MigrationPage;
