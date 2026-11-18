import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { SubscriptionSummariesService } from "~/lib/services/subscription-summaries.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class SubscriptionSummariesServer extends ServerLoader {
  #service = SubscriptionSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): SubscriptionSummariesServer {
    return new SubscriptionSummariesServer({ context: "subscription-summaries" });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["SubscriptionSummaries"]["Client"]["GetSubscriptionSummariesResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the subscription",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
