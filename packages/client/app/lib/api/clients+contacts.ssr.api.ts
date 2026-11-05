import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiClientsGetByIdArgs, ApiContactsGetByIdArgs } from "~/lib/api/_clients";

export class ApiContactsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiContactsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    id,
    query,
    filters,
  }: ApiClientsGetByIdArgs & ApiListArgs<Api["Contacts"]["Client"]["GetContactsFilters"]>): Promise<
    Api["Contacts"]["Client"]["GetContactsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/billing/clients/${id}/contacts?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.Contacts.GetContactsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/clients/${id}/contacts`,
      });
    }

    return ApiSchema.Contacts.GetContactsResponseSchema.parse(await response.json());
  };

  getById = async ({
    id,
  }: ApiContactsGetByIdArgs): Promise<Api["Contacts"]["Client"]["GetContactResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/contacts/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot get /billing/contacts/${id}` });
    }

    return ApiSchema.Contacts.GetContactResponseSchema.parse(await response.json());
  };
}
