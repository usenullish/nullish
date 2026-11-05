import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";

export class ApiUserReports extends AppApi {
  static create(): ApiUserReports {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  getLlmUsage = async (): Promise<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]> => {
    const response = await fetch(`${this.apiUrl}/user/reports/llm-usage`, {
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot get /user/reports/llm-usage" });
    }

    return ApiSchema.LlmUsage.GetLlmUsageResponseSchema.parse(await response.json());
  };
}
