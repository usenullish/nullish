import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiJournalGetByIdArgs } from "~/lib/api/_journal";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";

export class ApiJournalSummariesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiJournalSummariesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiJournalGetByIdArgs): Promise<
    Api["JournalSummaries"]["Client"]["GetJournalSummaryResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/journal-summaries/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/journal-summaries/${id}`,
      });
    }

    return ApiSchema.JournalSummaries.GetJournalSummaryResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["JournalSummaries"]["Client"]["GetJournalSummariesFilters"]>): Promise<
    Api["JournalSummaries"]["Client"]["GetJournalSummariesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/journal-summaries?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.JournalSummaries.GetJournalSummariesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/journal-summaries`,
      });
    }

    return ApiSchema.JournalSummaries.GetJournalSummariesResponseSchema.parse(
      await response.json(),
    );
  };
}
