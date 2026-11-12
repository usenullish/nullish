import { Api } from "~/lib/api/_api";
import { type Api as ApiTypes, ApiSchema } from "@usenullish/nullish-schema/server";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiSettingsSsr extends Api {
  static create(): ApiSettingsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  get = async (): Promise<ApiTypes["Settings"]["Client"]["GetSettingsResponse"]> => {
    const response = await fetch(`${this.apiUrl}/settings`);

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /settings" });
    }

    return ApiSchema.Settings.GetSettingsResponseSchema.parse(await response.json());
  };
}
