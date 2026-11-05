import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { VatRatesService } from "~/lib/services/vat+rates.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class VatRatesServer extends ServerLoader {
  #service = VatRatesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): VatRatesServer {
    return new VatRatesServer({ context: "vat+rates" });
  }

  async listVatRates(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatRates"]["Client"]["GetVatRatesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT rates",
      defaultSort: { field: "createdAt", direction: "asc" },
      filtersSchema: ApiSchema.VatRates.GetVatRatesFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAllVatRates(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatRates"]["Client"]["GetVatRatesResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT rates",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }

  async getVatRate(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatRates"]["Client"]["GetVatRateResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the VAT rate",
        missingId: "Missing VAT rate ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
