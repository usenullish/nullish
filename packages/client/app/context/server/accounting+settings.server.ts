import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { AccountingSettingsService } from "~/lib/services/accounting+settings.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class AccountingSettingsServer extends ServerLoader {
  #service = AccountingSettingsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): AccountingSettingsServer {
    return new AccountingSettingsServer({ context: "accounting-settings" });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["AccountingSettings"]["Client"]["GetAccountingSettingsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the accounting settings",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
