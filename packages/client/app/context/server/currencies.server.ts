import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { CurrenciesService } from "~/lib/services/currencies.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class CurrenciesServer extends ServerLoader {
  #service = CurrenciesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): CurrenciesServer {
    return new CurrenciesServer({ context: "currencies" });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Currencies"]["Client"]["GetCurrenciesResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the currencies",
      loaderFn: this.#service.listAll,
    });
  }
}
