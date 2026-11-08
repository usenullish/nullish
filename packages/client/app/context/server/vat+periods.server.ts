import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { VatPeriodsService } from "~/lib/services/vat+periods.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class VatPeriodsServer extends ServerLoader {
  #service = VatPeriodsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): VatPeriodsServer {
    return new VatPeriodsServer({ context: "vat+periods" });
  }

  async listVatPeriods(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatPeriods"]["Client"]["GetVatPeriodsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT periods",
      defaultSort: { field: "startOn", direction: "desc" },
      filtersSchema: ApiSchema.VatPeriods.GetVatPeriodsFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAllVatPeriods(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatPeriods"]["Client"]["GetVatPeriodsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the VAT periods",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }

  async getVatPeriod(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["VatPeriods"]["Client"]["GetVatPeriodResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the VAT period",
        missingId: "Missing VAT period ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
