import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiMigrationsGetByIdArgs } from "~/lib/api/_migrations";

export class ApiMigrationsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiMigrationsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & ApiListArgs): Promise<
    Api["Migrations"]["Client"]["GetMigrationsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/migrations?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/migrations`,
      });
    }

    return ApiSchema.Migrations.GetMigrationsResponseSchema.parse(await response.json());
  };

  getById = async ({
    id,
  }: ApiMigrationsGetByIdArgs): Promise<Api["Migrations"]["Client"]["GetMigrationResponse"]> => {
    const response = await fetch(`${this.apiUrl}/migrations/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot get /migrations/${id}` });
    }

    return ApiSchema.Migrations.GetMigrationResponseSchema.parse(await response.json());
  };

  listDatasets = async ({
    id,
    query,
  }: ApiMigrationsGetByIdArgs & ApiListArgs): Promise<
    Api["MigrationsDatasets"]["Client"]["GetDatasetsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/migrations/${id}/datasets?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /migrations/${id}/datasets`,
      });
    }

    return ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(await response.json());
  };
}
