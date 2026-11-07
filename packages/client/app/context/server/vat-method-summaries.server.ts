import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { VatMethodSummariesService } from "~/lib/services/vat-method-summaries.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class VatMethodSummariesServer extends ServerLoader {
  #service = VatMethodSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): VatMethodSummariesServer {
    return new VatMethodSummariesServer({ context: "vat-method-summaries" });
  }

  async listVatMethodSummaries(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatMethodSummaries"]["Client"]["GetVatMethodSummariesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT methods",
      defaultSort: { field: "startOn", direction: "desc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
