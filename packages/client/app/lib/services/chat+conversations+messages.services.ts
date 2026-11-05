import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiMessages } from "~/lib/api/chat+conversations+messages.api";
import { Service } from "./_services";

export class MessagesService extends Service {
  private constructor() {
    super();
  }

  static create(): MessagesService {
    return new this();
  }

  list = async (
    args: {
      conversationId: Api["Conversations"]["Client"]["Conversation"]["id"];
    } & ApiListArgs<Api["Messages"]["Client"]["GetMessagesFilters"]>,
  ): Promise<Result<Api["Messages"]["Client"]["GetMessagesResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiMessages.create().list(args);
    });
  };
}
