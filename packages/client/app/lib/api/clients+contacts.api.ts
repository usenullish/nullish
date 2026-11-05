import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiContactsGetByIdArgs, ApiWithClientIdArgs } from "~/lib/api/_clients";

export class ApiContacts extends AppApi {
  static create(): ApiContacts {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    clientId,
  }: {
    body: Api["Contacts"]["Client"]["CreateContactBody"];
  } & ApiWithClientIdArgs): Promise<Api["Contacts"]["Client"]["CreateContactResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/clients/${clientId}/contacts`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Contacts.CreateContactRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/clients/${clientId}/contacts`,
      });
    }

    const result = await response.json();

    return ApiSchema.Contacts.CreateContactResponseSchema.parse(result);
  };

  update = async ({
    id,
    body,
  }: {
    body: Api["Contacts"]["Client"]["UpdateContactBody"];
  } & ApiContactsGetByIdArgs): Promise<Api["Contacts"]["Client"]["UpdateContactResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/contacts/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Contacts.UpdateContactRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot patch /billing/contacts/${id}` });
    }

    const result = await response.json();

    return ApiSchema.Contacts.UpdateContactResponseSchema.parse(result);
  };

  delete = async ({ id }: ApiContactsGetByIdArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/contacts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot delete /billing/contacts/${id}` });
    }
  };
}
