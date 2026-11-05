import { Api as AppApi, type ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiConversations extends AppApi {
  static create(): ApiConversations {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  listUnscoped = async ({
    query,
  }: ApiListArgs): Promise<Api["Conversations"]["Client"]["GetConversationsResponse"]> => {
    const response = await fetch(
      `${this.apiUrl}/chat/conversations?${this.listSearchParams({ query })}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /chat/conversations" });
    }

    return ApiSchema.Conversations.GetConversationsResponseSchema.parse(await response.json());
  };

  listByOrganization = async ({
    orgId,
    query,
  }: ApiListArgs & ApiOrganizationsWritableArgs): Promise<
    Api["Conversations"]["Client"]["GetConversationsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/conversations?${this.listSearchParams({ query })}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/conversations`,
      });
    }

    return ApiSchema.Conversations.GetConversationsResponseSchema.parse(await response.json());
  };

  delete = async ({
    id,
  }: {
    id: Api["Conversations"]["Client"]["Conversation"]["id"];
  }): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/chat/conversations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /chat/conversations/${id}`,
      });
    }
  };
}
