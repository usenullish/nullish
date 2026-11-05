import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiVatSettingsWritableArgs } from "~/lib/api/_vat+settings";

export class ApiVatSettings extends AppApi {
  static create(): ApiVatSettings {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    vatSettingId,
    body,
  }: {
    body: Api["VatSettings"]["Client"]["UpdateVatSettingBody"];
  } & ApiVatSettingsWritableArgs): Promise<
    Api["VatSettings"]["Client"]["UpdateVatSettingResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/settings/${vatSettingId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatSettings.UpdateVatSettingRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/vat/settings/${vatSettingId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatSettings.UpdateVatSettingResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["VatSettings"]["Client"]["CreateVatSettingBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["VatSettings"]["Client"]["CreateVatSettingResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/vat/settings`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatSettings.CreateVatSettingRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/vat/settings`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatSettings.CreateVatSettingResponseSchema.parse(result);
  };
}
