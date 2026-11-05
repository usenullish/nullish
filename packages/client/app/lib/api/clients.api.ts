import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiClientsGetByIdArgs } from "~/lib/api/_clients";

export class ApiClients extends AppApi {
  static create(): ApiClients {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["Clients"]["Client"]["CreateClientBody"];
  } & ApiOrganizationsWritableArgs): Promise<Api["Clients"]["Client"]["CreateClientResponse"]> => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/billing/clients`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Clients.CreateClientRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/billing/clients`,
      });
    }

    const result = await response.json();

    return ApiSchema.Clients.CreateClientResponseSchema.parse(result);
  };

  update = async ({
    id,
    body,
  }: {
    body: Api["Clients"]["Client"]["UpdateClientBody"];
  } & ApiClientsGetByIdArgs): Promise<Api["Clients"]["Client"]["UpdateClientResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/clients/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Clients.UpdateClientRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot patch /billing/clients/${id}` });
    }

    const result = await response.json();

    return ApiSchema.Clients.UpdateClientResponseSchema.parse(result);
  };

  delete = async ({ id }: ApiClientsGetByIdArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/clients/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot delete /billing/clients/${id}` });
    }
  };
}
