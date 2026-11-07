import type { LoaderFunctionArgs } from "react-router";
import { MigrationsServer } from "~/context/server/migrations.server";
import { MigrationDatasetSummariesServer } from "~/context/server/migration-dataset-summaries.server";

export const loadMigrationImportData = async (args: LoaderFunctionArgs) => {
  const [migration, datasets, alreadyImportedDatasets] = await Promise.all([
    MigrationsServer.create().getMigration(args),
    MigrationsServer.create().listDatasets(args),
    MigrationDatasetSummariesServer.create().listAlreadyImportedDatasets(args),
  ]);

  return { migration, datasets, alreadyImportedDatasets };
};
