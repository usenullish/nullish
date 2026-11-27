import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiExports extends AppApi {
  static create(): ApiExports {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  generate = async ({
    orgId,
  }: ApiOrganizationsWritableArgs): Promise<Api["Exports"]["Client"]["GenerateExportResponse"]> => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/exports/generate`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/exports/generate`,
      });
    }

    const result = await response.json();

    return ApiSchema.Exports.GenerateExportResponseSchema.parse(result);
  };

  getJobState = async ({
    orgId,
    jobId,
  }: {
    jobId: Api["Exports"]["Client"]["GenerateExportResponse"]["jobId"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Exports"]["Client"]["ExportJobStateResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/exports/jobs/${jobId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/exports/jobs/${jobId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.Exports.ExportJobStateResponseSchema.parse(result);
  };
}
