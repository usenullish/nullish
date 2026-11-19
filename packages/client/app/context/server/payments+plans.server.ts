import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { PaymentsPlansService } from "~/lib/services/payments+plans.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class PaymentsPlansServer extends ServerLoader {
  #service = PaymentsPlansService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): PaymentsPlansServer {
    return new PaymentsPlansServer({ context: "payments-plans" });
  }

  async get(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["PaymentsPlans"]["Client"]["GetPlansResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the plans",
      loaderFn: this.#service.get,
    });
  }
}
