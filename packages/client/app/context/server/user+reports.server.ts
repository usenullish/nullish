import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { UserReportsService } from "~/lib/services/user+reports.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class UserReportsServer extends ServerLoader {
  #service = UserReportsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): UserReportsServer {
    return new UserReportsServer({ context: "user+reports" });
  }

  async getLlmUsage(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the LLM usage",
      loaderFn: this.#service.getLlmUsage,
    });
  }
}
