import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiInvoicesGetByIdArgs } from "~/lib/api/_invoices";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";

export class ApiInvoiceSummariesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiInvoiceSummariesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiInvoicesGetByIdArgs): Promise<
    Api["InvoiceSummaries"]["Client"]["GetInvoiceSummaryResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/invoice-summaries/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/invoice-summaries/${id}`,
      });
    }

    return ApiSchema.InvoiceSummaries.GetInvoiceSummaryResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummariesFilters"]>): Promise<
    Api["InvoiceSummaries"]["Client"]["GetInvoiceSummariesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/billing/invoice-summaries?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/billing/invoice-summaries`,
      });
    }

    return ApiSchema.InvoiceSummaries.GetInvoiceSummariesResponseSchema.parse(
      await response.json(),
    );
  };
}
