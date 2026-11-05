import * as z from "zod";
import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString, nonNullish } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type {
  ApiMigrationDatasetsWritableArgs,
  ApiMigrationsWritableArgs,
} from "~/lib/api/_migrations";

type UploadDatasetBody = Api["MigrationsDatasets"]["Client"]["UploadDatasetBody"];

export class ApiMigrations extends AppApi {
  static create(): ApiMigrations {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["Migrations"]["Client"]["CreateMigrationBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Migrations"]["Client"]["CreateMigrationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/migrations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Migrations.CreateMigrationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/migrations`,
      });
    }

    const result = await response.json();

    return ApiSchema.Migrations.CreateMigrationResponseSchema.parse(result);
  };

  delete = async ({ migrationId }: ApiMigrationsWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/migrations/${migrationId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /migrations/${migrationId}`,
      });
    }
  };

  uploadDataset = async ({
    migrationId,
    body,
  }: {
    body: UploadDatasetBody;
  } & ApiMigrationsWritableArgs): Promise<
    Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/migrations/${migrationId}/datasets`, {
      method: "POST",
      credentials: "include",
      body: this.#datasetFormData({ body }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /migrations/${migrationId}/datasets`,
      });
    }

    const result = await response.json();

    return ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema.parse(result);
  };

  replaceDataset = async ({
    migrationId,
    datasetId,
    body,
  }: {
    body: UploadDatasetBody;
  } & ApiMigrationsWritableArgs &
    ApiMigrationDatasetsWritableArgs): Promise<
    Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/migrations/${migrationId}/datasets/${datasetId}/replace`,
      {
        method: "POST",
        credentials: "include",
        body: this.#datasetFormData({ body }),
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /migrations/${migrationId}/datasets/${datasetId}/replace`,
      });
    }

    const result = await response.json();

    return ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema.parse(result);
  };

  deleteDataset = async ({ datasetId }: ApiMigrationDatasetsWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/migrations/datasets/${datasetId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /migrations/datasets/${datasetId}`,
      });
    }
  };

  run = async ({
    migrationId,
  }: ApiMigrationsWritableArgs): Promise<
    Api["MigrationsRun"]["Client"]["RunMigrationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/migrations/${migrationId}/run`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /migrations/${migrationId}/run`,
      });
    }

    const result = await response.json();

    return ApiSchema.MigrationsRun.RunMigrationResponseSchema.parse(result);
  };

  getRunJobState = async ({
    migrationId,
    jobId,
  }: {
    jobId: Api["MigrationsRun"]["Client"]["RunMigrationResponse"]["jobId"];
  } & ApiMigrationsWritableArgs): Promise<
    Api["MigrationsRun"]["Client"]["RunMigrationJobStateResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/migrations/${migrationId}/run/jobs/${jobId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /migrations/${migrationId}/run/jobs/${jobId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.MigrationsRun.RunMigrationJobStateResponseSchema.parse(result);
  };

  #datasetFormData({ body }: { body: UploadDatasetBody }): FormData {
    const formData = new FormData();

    Object.entries(z.encode(ApiSchema.MigrationsDatasets.UploadDatasetRequestSchema, body))
      .filter(([, value]) => nonNullish(value))
      .forEach(([key, value]) => formData.append(key, value));

    return formData;
  }
}
