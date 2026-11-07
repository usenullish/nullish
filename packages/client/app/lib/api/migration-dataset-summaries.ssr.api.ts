import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";

export class ApiMigrationDatasetSummariesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiMigrationDatasetSummariesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["MigrationDatasetSummaries"]["Client"]["GetDatasetSummariesFilters"]>): Promise<
    Api["MigrationDatasetSummaries"]["Client"]["GetDatasetSummariesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/migration-dataset-summaries?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/migration-dataset-summaries`,
      });
    }

    return ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema.parse(
      await response.json(),
    );
  };
}
