import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiPeriodsGetByIdArgs } from "~/lib/api/_periods";

export class ApiPeriodsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiPeriodsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiPeriodsGetByIdArgs): Promise<Api["Periods"]["Client"]["GetPeriodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/periods/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/periods/${id}`,
      });
    }

    return ApiSchema.Periods.GetPeriodResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Periods"]["Client"]["GetPeriodsFilters"]>): Promise<
    Api["Periods"]["Client"]["GetPeriodsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/periods?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Periods.GetPeriodsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: "Cannot get /organizations/${id}/accounting/periods",
      });
    }

    return ApiSchema.Periods.GetPeriodsResponseSchema.parse(await response.json());
  };
}
