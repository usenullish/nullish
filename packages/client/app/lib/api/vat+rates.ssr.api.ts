import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatRatesGetByIdArgs } from "~/lib/api/_vat+rates";

export class ApiVatRatesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiVatRatesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiVatRatesGetByIdArgs): Promise<Api["VatRates"]["Client"]["GetVatRateResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/rates/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/vat/rates/${id}`,
      });
    }

    return ApiSchema.VatRates.GetVatRateResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["VatRates"]["Client"]["GetVatRatesFilters"]>): Promise<
    Api["VatRates"]["Client"]["GetVatRatesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/vat/rates?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.VatRates.GetVatRatesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/vat/rates`,
      });
    }

    return ApiSchema.VatRates.GetVatRatesResponseSchema.parse(await response.json());
  };
}
