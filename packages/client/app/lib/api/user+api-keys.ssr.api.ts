import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiUserApiKeysSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiUserApiKeysSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async (): Promise<Api["UserApiKeys"]["Client"]["GetApiKeysResponse"]> => {
    const response = await fetch(`${this.apiUrl}/user/api-keys`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /user/api-keys" });
    }

    return ApiSchema.UserApiKeys.GetApiKeysResponseSchema.parse(await response.json());
  };
}
