import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { BillingSettingsService } from "~/lib/services/billing+settings.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class BillingSettingsServer extends ServerLoader {
  #service = BillingSettingsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): BillingSettingsServer {
    return new BillingSettingsServer({ context: "billing-settings" });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BillingSettings"]["Client"]["GetBillingSettingsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the billing settings",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
