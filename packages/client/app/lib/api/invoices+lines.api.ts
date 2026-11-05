import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiWithInvoiceIdArgs } from "~/lib/api/_invoices";

export class ApiLines extends AppApi {
  static create(): ApiLines {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    invoiceId,
  }: {
    body: Api["InvoicesLines"]["Client"]["CreateLineBody"];
  } & ApiWithInvoiceIdArgs): Promise<Api["InvoicesLines"]["Client"]["CreateLineResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/lines`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Lines.CreateLineRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/lines`,
      });
    }

    const result = await response.json();

    return ApiSchema.Lines.CreateLineResponseSchema.parse(result);
  };

  delete = async ({
    lineId,
  }: {
    lineId: NonNullable<Api["InvoicesLines"]["Client"]["GetLineResponse"]["line"]>["id"];
  }): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/lines/${lineId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot delete /billing/lines/${lineId}` });
    }
  };
}
