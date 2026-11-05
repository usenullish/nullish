import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatSettingsGetByIdArgs } from "~/lib/api/_vat+settings";

export class ApiVatSettingsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiVatSettingsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiVatSettingsGetByIdArgs): Promise<Api["VatSettings"]["Client"]["GetVatSettingResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/settings/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /accounting/vat/settings/${id}`,
      });
    }

    return ApiSchema.VatSettings.GetVatSettingResponseSchema.parse(await response.json());
  };

  list = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & ApiListArgs): Promise<
    Api["VatSettings"]["Client"]["GetVatSettingsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/vat/settings?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/vat/settings`,
      });
    }

    return ApiSchema.VatSettings.GetVatSettingsResponseSchema.parse(await response.json());
  };
}
