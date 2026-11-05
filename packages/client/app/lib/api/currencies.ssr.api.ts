import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiCurrenciesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiCurrenciesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    query,
  }: ApiListArgs): Promise<Api["Currencies"]["Client"]["GetCurrenciesResponse"]> => {
    const response = await fetch(`${this.apiUrl}/currencies?${this.listSearchParams({ query })}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /currencies" });
    }

    return ApiSchema.Currencies.GetCurrenciesResponseSchema.parse(await response.json());
  };
}
