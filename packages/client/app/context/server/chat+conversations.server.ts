import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { ConversationsService } from "~/lib/services/chat+conversations.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

type GetConversationResponse = Api["Conversations"]["Client"]["GetConversationResponse"];

export class ConversationsServer extends ServerLoader {
  #service = ConversationsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): ConversationsServer {
    return new ConversationsServer({ context: "chat+conversations" });
  }

  async getOrganizationConversation(
    args: LoaderFunctionArgs,
  ): Promise<Option<GetConversationResponse>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the conversation",
        missingId: "Missing conversation ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async getUnscopedConversation(
    args: LoaderFunctionArgs,
  ): Promise<Option<GetConversationResponse>> {
    return await this._loadWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the conversation",
        missingId: "Missing conversation ID",
      },
      loaderWithIdFn: this.#service.getById,
    });
  }
}
