import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiClientsGetByIdArgs } from "~/lib/api/_clients";

export class ApiClientsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiClientsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiClientsGetByIdArgs): Promise<Api["Clients"]["Client"]["GetClientResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/clients/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/clients/${id}`,
      });
    }

    return ApiSchema.Clients.GetClientResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Clients"]["Client"]["GetClientsFilters"]>): Promise<
    Api["Clients"]["Client"]["GetClientsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/billing/clients?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Clients.GetClientsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/billing/clients`,
      });
    }

    return ApiSchema.Clients.GetClientsResponseSchema.parse(await response.json());
  };
}
