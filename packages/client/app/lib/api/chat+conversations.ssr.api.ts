import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

type ConversationId = Api["Conversations"]["Client"]["Conversation"]["id"];

export class ApiConversationsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiConversationsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: {
    id: ConversationId;
  }): Promise<Api["Conversations"]["Client"]["GetConversationResponse"]> => {
    const response = await fetch(`${this.apiUrl}/chat/conversations/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /chat/conversations/${id}`,
      });
    }

    return ApiSchema.Conversations.GetConversationResponseSchema.parse(await response.json());
  };
}
