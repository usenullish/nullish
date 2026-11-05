import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { UserAssistantService } from "~/lib/services/user+assistant.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class UserAssistantServer extends ServerLoader {
  #service = UserAssistantService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): UserAssistantServer {
    return new UserAssistantServer({ context: "user+assistant" });
  }

  async getAssistant(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Assistant"]["Client"]["GetAssistantResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the assistant",
      loaderFn: this.#service.get,
    });
  }
}
