import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiPaymentsManage extends AppApi {
  static create(): ApiPaymentsManage {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    orgId,
  }: ApiOrganizationsWritableArgs): Promise<
    Api["PaymentsManage"]["Client"]["ManagePaymentsResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/payments/manage`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: "Cannot post /organizations/{id}/payments/manage",
      });
    }

    const result = await response.json();

    return ApiSchema.PaymentsManage.ManagePaymentsResponseSchema.parse(result);
  };
}
