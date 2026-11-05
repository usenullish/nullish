import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiSystemAccountsWritableArgs } from "~/lib/api/_accounts-system";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiSystemAccounts extends AppApi {
  static create(): ApiSystemAccounts {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    systemAccountId,
    body,
  }: {
    body: Api["SystemAccounts"]["Client"]["UpdateSystemAccountBody"];
  } & ApiSystemAccountsWritableArgs): Promise<
    Api["SystemAccounts"]["Client"]["UpdateSystemAccountResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/accounting/system-accounts/${systemAccountId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/system-accounts/${systemAccountId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.SystemAccounts.UpdateSystemAccountResponseSchema.parse(result);
  };

  submit = async ({
    orgId,
    body,
  }: {
    body: Api["SystemAccounts"]["Client"]["CreateSystemAccountBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["SystemAccounts"]["Client"]["CreateSystemAccountResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/system-accounts`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: encodeJsonBody({
          schema: ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema,
          body,
        }),
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/system-accounts`,
      });
    }

    const result = await response.json();

    return ApiSchema.SystemAccounts.CreateSystemAccountResponseSchema.parse(result);
  };
}
