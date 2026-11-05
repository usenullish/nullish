import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiVatPeriodsWritableArgs } from "~/lib/api/_vat+periods";

export class ApiVatPeriods extends AppApi {
  static create(): ApiVatPeriods {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    vatPeriodId,
    body,
  }: {
    body: Api["VatPeriods"]["Client"]["UpdateVatPeriodBody"];
  } & ApiVatPeriodsWritableArgs): Promise<
    Api["VatPeriods"]["Client"]["UpdateVatPeriodResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/vat/periods/${vatPeriodId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/vat/periods/${vatPeriodId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatPeriods.UpdateVatPeriodResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["VatPeriods"]["Client"]["CreateVatPeriodBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["VatPeriods"]["Client"]["CreateVatPeriodResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/vat/periods`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.VatPeriods.CreateVatPeriodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/vat/periods`,
      });
    }

    const result = await response.json();

    return ApiSchema.VatPeriods.CreateVatPeriodResponseSchema.parse(result);
  };
}
