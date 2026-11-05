import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiPeriods extends AppApi {
  static create(): ApiPeriods {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["Periods"]["Client"]["CreatePeriodBody"];
  } & ApiOrganizationsWritableArgs): Promise<Api["Periods"]["Client"]["CreatePeriodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/periods`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Periods.CreatePeriodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/periods`,
      });
    }

    const result = await response.json();

    return ApiSchema.Periods.CreatePeriodResponseSchema.parse(result);
  };

  update = async ({
    periodId,
    body,
  }: {
    periodId: Api["Periods"]["Client"]["Period"]["id"];
    body: Api["Periods"]["Client"]["UpdatePeriodBody"];
  }): Promise<Api["Periods"]["Client"]["UpdatePeriodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/periods/${periodId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Periods.UpdatePeriodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot patch /accounting/periods/${periodId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.Periods.UpdatePeriodResponseSchema.parse(result);
  };

  close = async ({
    periodId,
    body,
  }: {
    periodId: Api["Periods"]["Client"]["Period"]["id"];
    body: Api["Periods"]["Client"]["ClosePeriodBody"];
  }): Promise<Api["Periods"]["Client"]["ClosePeriodResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/periods/${periodId}/close`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.PeriodsClose.ClosePeriodRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/periods/${periodId}/close`,
      });
    }

    const result = await response.json();

    return ApiSchema.PeriodsClose.ClosePeriodResponseSchema.parse(result);
  };
}
