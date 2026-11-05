import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";

export class ApiUserReportsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiUserReportsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getLlmUsage = async (): Promise<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]> => {
    const response = await fetch(`${this.apiUrl}/user/reports/llm-usage`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /user/reports/llm-usage" });
    }

    return ApiSchema.LlmUsage.GetLlmUsageResponseSchema.parse(await response.json());
  };
}
