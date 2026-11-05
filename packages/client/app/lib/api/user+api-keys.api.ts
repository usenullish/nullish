import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";

export class ApiUserApiKeys extends AppApi {
  static create(): ApiUserApiKeys {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
  }: {
    body: Api["UserApiKeys"]["Client"]["CreateApiKeyBody"];
  }): Promise<Api["UserApiKeys"]["Client"]["CreateApiKeyResponse"]> => {
    const response = await fetch(`${this.apiUrl}/user/api-keys`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.UserApiKeys.CreateApiKeyRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot post /user/api-keys" });
    }

    return ApiSchema.UserApiKeys.CreateApiKeyResponseSchema.parse(await response.json());
  };

  delete = async ({
    apiKeyId,
  }: {
    apiKeyId: Api["UserApiKeys"]["Client"]["ApiKey"]["id"];
  }): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/user/api-keys/${apiKeyId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /user/api-keys/${apiKeyId}`,
      });
    }
  };
}
