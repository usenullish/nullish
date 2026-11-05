import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiMigrationsSsr } from "~/lib/api/migrations.ssr.api";
import { ApiMigrations } from "~/lib/api/migrations.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type {
  ApiMigrationDatasetsWritableArgs,
  ApiMigrationsGetByIdArgs,
  ApiMigrationsWritableArgs,
} from "~/lib/api/_migrations";
import { Service } from "./_services";

export class MigrationsService extends Service {
  private constructor() {
    super();
  }

  static create(): MigrationsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["Migrations"]["Client"]["GetMigrationsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiMigrationsSsr.create({ cookie }).list(rest);
    });
  };

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiMigrationsGetByIdArgs): Promise<
    Result<Api["Migrations"]["Client"]["GetMigrationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiMigrationsSsr.create({ cookie }).getById({ id });
    });
  };

  listDatasets = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiMigrationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["MigrationsDatasets"]["Client"]["GetDatasetsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiMigrationsSsr.create({ cookie }).listDatasets(rest);
    });
  };

  submit = async ({
    migration: body,
    organizationId: orgId,
  }: {
    migration: Api["Migrations"]["Client"]["CreateMigrationBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Migrations"]["Client"]["CreateMigrationResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiMigrations.create().submit({ body, orgId });
    });
  };

  delete = async ({ migrationId }: ApiMigrationsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiMigrations.create().delete({ migrationId });
    });
  };

  uploadDataset = async ({
    migrationId,
    dataset: body,
  }: {
    dataset: Api["MigrationsDatasets"]["Client"]["UploadDatasetBody"];
  } & ApiMigrationsWritableArgs): Promise<
    Result<Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiMigrations.create().uploadDataset({ migrationId, body });
    });
  };

  replaceDataset = async ({
    dataset: body,
    ...rest
  }: {
    dataset: Api["MigrationsDatasets"]["Client"]["UploadDatasetBody"];
  } & ApiMigrationsWritableArgs &
    ApiMigrationDatasetsWritableArgs): Promise<
    Result<Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiMigrations.create().replaceDataset({ ...rest, body });
    });
  };

  deleteDataset = async ({
    datasetId,
  }: ApiMigrationDatasetsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiMigrations.create().deleteDataset({ datasetId });
    });
  };

  run = async ({
    migrationId,
  }: ApiMigrationsWritableArgs): Promise<
    Result<Api["MigrationsRun"]["Client"]["RunMigrationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiMigrations.create().run({ migrationId });
    });
  };

  getRunJobState = async ({
    migrationId,
    jobId,
  }: {
    jobId: Api["MigrationsRun"]["Client"]["RunMigrationResponse"]["jobId"];
  } & ApiMigrationsWritableArgs): Promise<
    Result<Api["MigrationsRun"]["Client"]["RunMigrationJobStateResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiMigrations.create().getRunJobState({ migrationId, jobId });
    });
  };
}
