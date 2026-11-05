import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiSystemAccountsGetByIdArgs } from "~/lib/api/_accounts-system";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";

export class ApiSystemAccountsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiSystemAccountsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["SystemAccounts"]["Client"]["GetSystemAccountsFilters"]>): Promise<
    Api["SystemAccounts"]["Client"]["GetSystemAccountsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/system-accounts?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.SystemAccounts.GetSystemAccountsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/system-accounts`,
      });
    }

    return ApiSchema.SystemAccounts.GetSystemAccountsResponseSchema.parse(await response.json());
  };

  getById = async ({
    id,
  }: ApiSystemAccountsGetByIdArgs): Promise<
    Api["SystemAccounts"]["Client"]["GetSystemAccountResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/system-accounts/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/system-accounts/${id}`,
      });
    }

    return ApiSchema.SystemAccounts.GetSystemAccountResponseSchema.parse(await response.json());
  };
}
