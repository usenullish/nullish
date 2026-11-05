import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiBankRelationsGetByIdArgs } from "~/lib/api/_bank-relations";
import type { ApiBankMovementsGetByIdArgs } from "~/lib/api/_bank-movements";

export class ApiBankMovementsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiBankMovementsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiBankMovementsGetByIdArgs): Promise<
    Api["BankMovements"]["Client"]["GetBankMovementResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/banking/movements/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /banking/movements/${id}`,
      });
    }

    return ApiSchema.BankMovements.GetBankMovementResponseSchema.parse(await response.json());
  };

  list = async ({
    id,
    query,
    filters,
  }: ApiBankRelationsGetByIdArgs &
    ApiListArgs<Api["BankMovements"]["Client"]["GetBankMovementsFilters"]>): Promise<
    Api["BankMovements"]["Client"]["GetBankMovementsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/banking/relations/${id}/movements?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.BankMovements.GetBankMovementsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /banking/relations/${id}/movements`,
      });
    }

    return ApiSchema.BankMovements.GetBankMovementsResponseSchema.parse(await response.json());
  };
}
