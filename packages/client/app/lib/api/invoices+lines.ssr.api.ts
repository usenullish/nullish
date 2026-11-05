import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiInvoicesGetByIdArgs } from "~/lib/api/_invoices";

export class ApiInvoicesLinesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiInvoicesLinesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    id,
    query,
    filters,
  }: ApiInvoicesGetByIdArgs &
    ApiListArgs<Api["InvoicesLines"]["Client"]["GetLinesFilters"]>): Promise<
    Api["InvoicesLines"]["Client"]["GetLinesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/billing/invoices/${id}/lines?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Lines.GetLinesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/invoices/${id}/lines`,
      });
    }

    return ApiSchema.Lines.GetLinesResponseSchema.parse(await response.json());
  };
}
