import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { VatSettingsService } from "~/lib/services/vat+settings.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class VatSettingsServer extends ServerLoader {
  #service = VatSettingsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): VatSettingsServer {
    return new VatSettingsServer({ context: "vat+settings" });
  }

  async getVatSetting(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatSettings"]["Client"]["GetVatSettingResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the VAT setting",
        missingId: "Missing VAT setting ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listVatSettings(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatSettings"]["Client"]["GetVatSettingsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT settings",
      defaultSort: { field: "createdAt", direction: "asc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
