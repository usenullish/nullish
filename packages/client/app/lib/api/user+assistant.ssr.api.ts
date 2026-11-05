import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiUserAssistantSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiUserAssistantSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  get = async (): Promise<Api["Assistant"]["Client"]["GetAssistantResponse"]> => {
    const response = await fetch(`${this.apiUrl}/user/assistant`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /user/assistant" });
    }

    return ApiSchema.Assistant.GetAssistantResponseSchema.parse(await response.json());
  };
}
