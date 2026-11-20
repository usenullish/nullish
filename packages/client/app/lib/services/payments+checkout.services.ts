import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import { ApiPaymentsCheckout } from "~/lib/api/payments+checkout.api";
import { Service } from "./_services";

export class PaymentsCheckoutService extends Service {
  private constructor() {
    super();
  }

  static create(): PaymentsCheckoutService {
    return new this();
  }

  submit = async ({
    orgId,
    checkout,
  }: {
    checkout: Api["PaymentsCheckout"]["Client"]["CheckoutPaymentsBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Result<Api["PaymentsCheckout"]["Client"]["CheckoutPaymentsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiPaymentsCheckout.create().submit({ orgId, body: checkout });
    });
  };
}
