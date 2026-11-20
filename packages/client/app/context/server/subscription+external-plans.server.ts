import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { ExternalPlansService } from "~/lib/services/subscription+external-plans.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class ExternalPlansServer extends ServerLoader {
  #service = ExternalPlansService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): ExternalPlansServer {
    return new ExternalPlansServer({ context: "external-plans" });
  }

  async get(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["ExternalPlans"]["Client"]["GetExternalPlansResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the plans",
      loaderFn: this.#service.get,
    });
  }
}
