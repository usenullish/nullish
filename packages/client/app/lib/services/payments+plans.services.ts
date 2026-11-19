import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiPaymentsPlansSsr } from "~/lib/api/payments+plans.ssr.api";
import { Service } from "./_services";

export class PaymentsPlansService extends Service {
  private constructor() {
    super();
  }

  static create(): PaymentsPlansService {
    return new this();
  }

  get = async (args: {
    cookie: Cookie;
  }): Promise<Result<Api["PaymentsPlans"]["Client"]["GetPlansResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiPaymentsPlansSsr.create(args).get();
    });
  };
}
