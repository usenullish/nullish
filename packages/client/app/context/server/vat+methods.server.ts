import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { VatMethodsService } from "~/lib/services/vat+methods.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class VatMethodsServer extends ServerLoader {
  #service = VatMethodsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): VatMethodsServer {
    return new VatMethodsServer({ context: "vat+methods" });
  }

  async getVatMethod(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatMethods"]["Client"]["GetVatMethodResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the VAT methods",
        missingId: "Missing VAT methods ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listAllVatMethods(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatMethods"]["Client"]["GetVatMethodsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT methods",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
