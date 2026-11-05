import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { UserApiKeysService } from "~/lib/services/user+api-keys.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class UserApiKeysServer extends ServerLoader {
  #service = UserApiKeysService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): UserApiKeysServer {
    return new UserApiKeysServer({ context: "user+api-keys" });
  }

  async list(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["UserApiKeys"]["Client"]["GetApiKeysResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the API keys",
      loaderFn: this.#service.list,
    });
  }
}
