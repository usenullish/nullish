import { Api as AppApi } from "~/lib/api/_api";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import type { ApiOrganizationMembersWritableArgs } from "~/lib/api/_organization-members";

export class ApiOrganizationMembers extends AppApi {
  static create(): ApiOrganizationMembers {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  delete = async ({ membershipId }: ApiOrganizationMembersWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/members/${membershipId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /members/${membershipId}`,
      });
    }
  };
}
