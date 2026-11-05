import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiConversationsSsr } from "~/lib/api/chat+conversations.ssr.api";
import { ApiConversations } from "~/lib/api/chat+conversations.api";
import { Service } from "./_services";

export class ConversationsService extends Service {
  private constructor() {
    super();
  }

  static create(): ConversationsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
    id: Api["Conversations"]["Client"]["Conversation"]["id"];
  }): Promise<Result<Api["Conversations"]["Client"]["GetConversationResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiConversationsSsr.create({ cookie }).getById({ id });
    });
  };

  listUnscoped = async (
    args: ApiListArgs,
  ): Promise<Result<Api["Conversations"]["Client"]["GetConversationsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiConversations.create().listUnscoped(args);
    });
  };

  listByOrganization = async (
    args: ApiListArgs & ApiOrganizationsWritableArgs,
  ): Promise<Result<Api["Conversations"]["Client"]["GetConversationsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiConversations.create().listByOrganization(args);
    });
  };

  delete = async ({
    id,
  }: {
    id: Api["Conversations"]["Client"]["Conversation"]["id"];
  }): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiConversations.create().delete({ id });
    });
  };
}
