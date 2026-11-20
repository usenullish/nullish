import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiCustomPlansSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiCustomPlansSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  get = async (): Promise<Api["CustomPlans"]["Client"]["GetCustomPlansResponse"]> => {
    const response = await fetch(`${this.apiUrl}/subscription/custom-plans`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /subscription/custom-plans" });
    }

    return ApiSchema.CustomPlans.GetCustomPlansResponseSchema.parse(await response.json());
  };
}
