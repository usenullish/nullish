import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiUserReportsSsr } from "~/lib/api/user+reports.ssr.api";
import { ApiUserReports } from "~/lib/api/user+reports.api";
import { Service } from "./_services";

export class UserReportsService extends Service {
  private constructor() {
    super();
  }

  static create(): UserReportsService {
    return new this();
  }

  getLlmUsage = async ({
    cookie,
  }: {
    cookie: Cookie;
  }): Promise<Result<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiUserReportsSsr.create({ cookie }).getLlmUsage();
    });
  };

  reloadLlmUsage = async (): Promise<Result<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiUserReports.create().getLlmUsage();
    });
  };
}
