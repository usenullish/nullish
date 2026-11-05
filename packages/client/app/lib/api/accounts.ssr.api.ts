import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiAccountsGetByIdArgs } from "~/lib/api/_accounts";

export class ApiAccountsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiAccountsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Accounts"]["Client"]["GetAccountsFilters"]>): Promise<
    Api["Accounts"]["Client"]["GetAccountsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/accounts?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Accounts.GetAccountsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/accounts`,
      });
    }

    return ApiSchema.Accounts.GetAccountsResponseSchema.parse(await response.json());
  };

  getById = async ({
    id,
  }: ApiAccountsGetByIdArgs): Promise<Api["Accounts"]["Client"]["GetAccountResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/accounts/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/accounts/${id}`,
      });
    }

    return ApiSchema.Accounts.GetAccountResponseSchema.parse(await response.json());
  };
}
