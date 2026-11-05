import type { Cookie } from "~/lib/schemas/cookie";
import { Service } from "./_services";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiCurrenciesSsr } from "~/lib/api/currencies.ssr.api";

export class CurrenciesService extends Service {
  private constructor() {
    super();
  }

  static create(): CurrenciesService {
    return new this();
  }

  listAll = async (args: {
    cookie: Cookie;
  }): Promise<Result<Api["Currencies"]["Client"]["GetCurrenciesResponse"]>> => {
    return await tryCatch(async () => {
      const api = ApiCurrenciesSsr.create(args);

      const currencies = await this._listAll({
        listFn: async (query) => {
          const { currencies } = await api.list({ query });
          return currencies;
        },
      });

      return { currencies };
    });
  };
}
