import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";

export class ApiInvitationsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiInvitationsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & ApiListArgs): Promise<
    Api["Invitations"]["Client"]["GetInvitationsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/invitations?${this.listSearchParams({ query })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/invitations`,
      });
    }

    return ApiSchema.Invitations.GetInvitationsResponseSchema.parse(await response.json());
  };
}
