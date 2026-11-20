import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiExternalPlansSsr } from "~/lib/api/subscription+external-plans.ssr.api";
import { Service } from "./_services";

export class ExternalPlansService extends Service {
  private constructor() {
    super();
  }

  static create(): ExternalPlansService {
    return new this();
  }

  get = async (args: {
    cookie: Cookie;
  }): Promise<Result<Api["ExternalPlans"]["Client"]["GetExternalPlansResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiExternalPlansSsr.create(args).get();
    });
  };
}
