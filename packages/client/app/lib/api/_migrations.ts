import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiMigrationsGetByIdArgs {
  id: Api["Migrations"]["Client"]["Migration"]["id"];
}

export interface ApiMigrationsWritableArgs {
  migrationId: Api["Migrations"]["Client"]["Migration"]["id"];
}

export interface ApiMigrationDatasetsWritableArgs {
  datasetId: Api["MigrationsDatasets"]["Client"]["Dataset"]["id"];
}
