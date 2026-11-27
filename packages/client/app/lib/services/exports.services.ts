import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiExports } from "~/lib/api/exports.api";
import { Service } from "./_services";

export class ExportsService extends Service {
  private constructor() {
    super();
  }

  static create(): ExportsService {
    return new this();
  }

  generate = async ({
    orgId,
  }: ApiOrganizationsWritableArgs): Promise<
    Result<Api["Exports"]["Client"]["GenerateExportResponse"]>
  > => {
    return await tryCatch(async () => await ApiExports.create().generate({ orgId }));
  };

  getJobState = async ({
    orgId,
    jobId,
  }: {
    jobId: Api["Exports"]["Client"]["GenerateExportResponse"]["jobId"];
  } & ApiOrganizationsWritableArgs): Promise<
    Result<Api["Exports"]["Client"]["ExportJobStateResponse"]>
  > => {
    return await tryCatch(async () => await ApiExports.create().getJobState({ orgId, jobId }));
  };
}
