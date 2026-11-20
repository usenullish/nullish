import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiPaymentsCheckout extends AppApi {
  static create(): ApiPaymentsCheckout {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    orgId,
    body,
  }: {
    body: Api["PaymentsCheckout"]["Client"]["CheckoutPaymentsBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["PaymentsCheckout"]["Client"]["CheckoutPaymentsResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/payments/checkout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.PaymentsCheckout.CheckoutPaymentsRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: "Cannot post /organizations/{id}/payments/checkout",
      });
    }

    const result = await response.json();

    return ApiSchema.PaymentsCheckout.CheckoutPaymentsResponseSchema.parse(result);
  };
}
