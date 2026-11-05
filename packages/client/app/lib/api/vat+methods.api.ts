import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiVatMethodsWritableArgs } from "~/lib/api/_vat+methods";

export class ApiVatMethods extends AppApi {
  static create(): ApiVatMethods {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    vatMethodId,
    body,
  }: {
    body: Api["VatMethods"]["Client"]["UpdateVatMethodBody"];
  } & ApiVatMethodsWritableArgs): Promise<
    Api["VatMethods"]["Client"]["UpdateVatMethodResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/methods/${vatMethodId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatMethods.UpdateVatMethodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/vat/methods/${vatMethodId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatMethods.UpdateVatMethodResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["VatMethods"]["Client"]["CreateVatMethodBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["VatMethods"]["Client"]["CreateVatMethodResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/vat/methods`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatMethods.CreateVatMethodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/vat/methods`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatMethods.CreateVatMethodResponseSchema.parse(result);
  };
}
