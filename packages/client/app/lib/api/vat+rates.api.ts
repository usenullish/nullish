import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiVatRatesWritableArgs } from "~/lib/api/_vat+rates";

export class ApiVatRates extends AppApi {
  static create(): ApiVatRates {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    vatRateId,
    body,
  }: {
    body: Api["VatRates"]["Client"]["UpdateVatRateBody"];
  } & ApiVatRatesWritableArgs): Promise<Api["VatRates"]["Client"]["UpdateVatRateResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/rates/${vatRateId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatRates.UpdateVatRateRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/vat/rates/${vatRateId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatRates.UpdateVatRateResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["VatRates"]["Client"]["CreateVatRateBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["VatRates"]["Client"]["CreateVatRateResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/vat/rates`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatRates.CreateVatRateRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/vat/rates`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatRates.CreateVatRateResponseSchema.parse(result);
  };
}
