import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatMethodsGetByIdArgs } from "~/lib/api/_vat+methods";

export class ApiVatMethodsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiVatMethodsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiVatMethodsGetByIdArgs): Promise<Api["VatMethods"]["Client"]["GetVatMethodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/methods/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/vat/methods/${id}`,
      });
    }

    return ApiSchema.VatMethods.GetVatMethodResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & ApiListArgs): Promise<
    Api["VatMethods"]["Client"]["GetVatMethodsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/vat/methods?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/vat/methods`,
      });
    }

    return ApiSchema.VatMethods.GetVatMethodsResponseSchema.parse(await response.json());
  };
}
