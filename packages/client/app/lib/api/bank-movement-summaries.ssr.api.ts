import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiBankRelationsGetByIdArgs } from "~/lib/api/_bank-relations";

export class ApiBankMovementSummariesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiBankMovementSummariesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    id,
    query,
    filters,
  }: ApiBankRelationsGetByIdArgs &
    ApiListArgs<
      Api["BankMovementSummaries"]["Client"]["GetBankMovementSummariesFilters"]
    >): Promise<Api["BankMovementSummaries"]["Client"]["GetBankMovementSummariesResponse"]> => {
    const response = await fetch(
      `${this.apiUrl}/banking/relations/${id}/movement-summaries?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.BankMovementSummaries.GetBankMovementSummariesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /banking/relations/${id}/movement-summaries`,
      });
    }

    return ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema.parse(
      await response.json(),
    );
  };
}
