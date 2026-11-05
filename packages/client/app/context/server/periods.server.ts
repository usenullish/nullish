import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { PeriodsService } from "~/lib/services/periods.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class PeriodsServer extends ServerLoader {
  #service = PeriodsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): PeriodsServer {
    return new PeriodsServer({ context: "periods" });
  }

  async getPeriod(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Periods"]["Client"]["GetPeriodResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the period",
        missingId: "Missing period ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listPeriods(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Periods"]["Client"]["GetPeriodsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the periods",
      defaultSort: { field: "startOn", direction: "desc" },
      filtersSchema: ApiSchema.Periods.GetPeriodsFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAllPeriods(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Periods"]["Client"]["GetPeriodsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the periods",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
