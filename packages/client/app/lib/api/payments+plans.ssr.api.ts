import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiPaymentsPlansSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiPaymentsPlansSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  get = async (): Promise<Api["PaymentsPlans"]["Client"]["GetPlansResponse"]> => {
    const response = await fetch(`${this.apiUrl}/payments/plans`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /payments/plans" });
    }

    return ApiSchema.PaymentsPlans.GetPlansResponseSchema.parse(await response.json());
  };
}
