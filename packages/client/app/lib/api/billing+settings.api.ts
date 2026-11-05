import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiBillingSettingsWritableArgs } from "~/lib/api/_billing+settings";

export class ApiBillingSettings extends AppApi {
  static create(): ApiBillingSettings {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    billingSettingId,
    body,
  }: {
    body: Api["BillingSettings"]["Client"]["UpdateBillingSettingBody"];
  } & ApiBillingSettingsWritableArgs): Promise<
    Api["BillingSettings"]["Client"]["UpdateBillingSettingResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/settings/${billingSettingId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot patch /billing/settings/${billingSettingId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.BillingSettings.UpdateBillingSettingResponseSchema.parse(result);
  };
}
