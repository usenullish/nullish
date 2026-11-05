import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiOrganizations extends AppApi {
  static create(): ApiOrganizations {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
  }: {
    body: Api["Organizations"]["Client"]["CreateOrganizationBody"];
  }): Promise<Api["Organizations"]["Client"]["CreateOrganizationResponse"]> => {
    const response = await fetch(`${this.apiUrl}/organizations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Organizations.CreateOrganizationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot post /organizations" });
    }

    const result = await response.json();

    return ApiSchema.Organizations.CreateOrganizationResponseSchema.parse(result);
  };

  update = async ({
    orgId,
    body,
  }: {
    body: Api["Organizations"]["Client"]["UpdateOrganizationBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Organizations"]["Client"]["UpdateOrganizationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Organizations.UpdateOrganizationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot patch /organizations/${orgId}` });
    }

    const result = await response.json();

    return ApiSchema.Organizations.UpdateOrganizationResponseSchema.parse(result);
  };

  delete = async ({
    orgId,
  }: ApiOrganizationsWritableArgs): Promise<
    Api["Organizations"]["Client"]["DeleteOrganizationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/delete`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/delete`,
      });
    }

    const result = await response.json();

    return ApiSchema.OrganizationsDelete.DeleteOrganizationResponseSchema.parse(result);
  };
}
