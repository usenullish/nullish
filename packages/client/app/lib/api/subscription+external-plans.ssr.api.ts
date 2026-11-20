import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiExternalPlansSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiExternalPlansSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  get = async (): Promise<Api["ExternalPlans"]["Client"]["GetExternalPlansResponse"]> => {
    const response = await fetch(`${this.apiUrl}/subscription/external-plans`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: "Cannot get /subscription/external-plans",
      });
    }

    return ApiSchema.ExternalPlans.GetExternalPlansResponseSchema.parse(await response.json());
  };
}
