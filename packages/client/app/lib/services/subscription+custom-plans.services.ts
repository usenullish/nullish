import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiCustomPlansSsr } from "~/lib/api/subscription+custom-plans.ssr.api";
import { Service } from "./_services";

export class CustomPlansService extends Service {
  private constructor() {
    super();
  }

  static create(): CustomPlansService {
    return new this();
  }

  get = async (args: {
    cookie: Cookie;
  }): Promise<Result<Api["CustomPlans"]["Client"]["GetCustomPlansResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiCustomPlansSsr.create(args).get();
    });
  };
}
