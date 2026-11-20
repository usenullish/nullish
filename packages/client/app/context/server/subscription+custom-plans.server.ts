import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { CustomPlansService } from "~/lib/services/subscription+custom-plans.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class CustomPlansServer extends ServerLoader {
  #service = CustomPlansService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): CustomPlansServer {
    return new CustomPlansServer({ context: "custom-plans" });
  }

  async get(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["CustomPlans"]["Client"]["GetCustomPlansResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the custom plans",
      loaderFn: this.#service.get,
    });
  }
}
