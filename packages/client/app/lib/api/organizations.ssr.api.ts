import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiOrganizationsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiOrganizationsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    query,
    filters,
  }: ApiListArgs<Api["Organizations"]["Client"]["GetOrganizationsFilters"]>): Promise<
    Api["Organizations"]["Client"]["GetOrganizationsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Organizations.GetOrganizationsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /organizations" });
    }

    return ApiSchema.Organizations.GetOrganizationsResponseSchema.parse(await response.json());
  };
}
