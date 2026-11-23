import type { Route } from "./+types/orgs.$org-id_.migrations.$id.import";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { MigrationWizard } from "~/components/settings/migrations/wizard/migration-wizard";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { loadMigrationImportData } from "~/context/loaders/migration-import.loader.server";
import { OrganizationPath, UnscopedPath } from "~/navigation";

export const loader = async (args: Route.LoaderArgs) => {
  return await loadMigrationImportData(args);
};

// /orgs/:orgId/migrations/:id/import
const MigrationPage = ({ loaderData, params }: Route.ComponentProps) => {
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  const migration = loaderData?.migration?.migration;
  const datasets = loaderData?.datasets?.data ?? [];
  const alreadyImportedDatasets = loaderData?.alreadyImportedDatasets?.data ?? [];

  if (isNullish(organization)) {
    return <Navigate to={UnscopedPath.create().toOrganizations()} replace />;
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
