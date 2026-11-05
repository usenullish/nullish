import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiAccountsWritableArgs } from "~/lib/api/_accounts";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiAccounts extends AppApi {
  static create(): ApiAccounts {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    accountId,
    body,
  }: {
    body: Api["Accounts"]["Client"]["UpdateAccountBody"];
  } & ApiAccountsWritableArgs): Promise<Api["Accounts"]["Client"]["UpdateAccountResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/accounts/${accountId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Accounts.UpdateAccountRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /accounting/accounts/${accountId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.Accounts.UpdateAccountResponseSchema.parse(result);
  };

  submit = async ({
    orgId,
    body,
  }: {
    body: Api["Accounts"]["Client"]["CreateAccountBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Accounts"]["Client"]["CreateAccountResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/accounts`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Accounts.CreateAccountRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/accounts`,
      });
    }

    const result = await response.json();

    return ApiSchema.Accounts.CreateAccountResponseSchema.parse(result);
  };

  delete = async ({ accountId }: ApiAccountsWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/accounting/accounts/${accountId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /accounting/accounts/${accountId}`,
      });
    }
  };
}
