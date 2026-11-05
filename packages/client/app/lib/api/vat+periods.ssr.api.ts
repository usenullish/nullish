import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatPeriodsGetByIdArgs } from "~/lib/api/_vat+periods";

export class ApiVatPeriodsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiVatPeriodsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiVatPeriodsGetByIdArgs): Promise<Api["VatPeriods"]["Client"]["GetVatPeriodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/periods/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/vat/periods/${id}`,
      });
    }

    return ApiSchema.VatPeriods.GetVatPeriodResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["VatPeriods"]["Client"]["GetVatPeriodsFilters"]>): Promise<
    Api["VatPeriods"]["Client"]["GetVatPeriodsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/vat/periods?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.VatPeriods.GetVatPeriodsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/vat/periods`,
      });
    }

    return ApiSchema.VatPeriods.GetVatPeriodsResponseSchema.parse(await response.json());
  };
}
