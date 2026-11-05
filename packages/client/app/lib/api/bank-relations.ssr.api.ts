import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiBankRelationsGetByIdArgs } from "~/lib/api/_bank-relations";

export class ApiBankRelationsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiBankRelationsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiBankRelationsGetByIdArgs): Promise<
    Api["BankRelations"]["Client"]["GetBankRelationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/banking/relations/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /banking/relations/${id}`,
      });
    }

    return ApiSchema.BankRelations.GetBankRelationResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & ApiListArgs): Promise<
    Api["BankRelations"]["Client"]["GetBankRelationsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/banking/relations?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/banking/relations`,
      });
    }

    return ApiSchema.BankRelations.GetBankRelationsResponseSchema.parse(await response.json());
  };
}
