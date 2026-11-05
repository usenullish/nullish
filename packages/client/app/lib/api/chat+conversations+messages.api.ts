import { Api as AppApi, type ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";

export class ApiMessages extends AppApi {
  static create(): ApiMessages {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  list = async ({
    conversationId,
    query,
    filters,
  }: {
    conversationId: Api["Conversations"]["Client"]["Conversation"]["id"];
  } & ApiListArgs<Api["Messages"]["Client"]["GetMessagesFilters"]>): Promise<
    Api["Messages"]["Client"]["GetMessagesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/chat/conversations/${conversationId}/messages?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Messages.GetMessagesFiltersQuerySchema } })}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /chat/conversations/${conversationId}/messages`,
      });
    }

    return ApiSchema.Messages.GetMessagesResponseSchema.parse(await response.json());
  };
}
