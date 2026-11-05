import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiInvitationsTokenArgs, ApiInvitationsWritableArgs } from "~/lib/api/_invitations";

export class ApiInvitations extends AppApi {
  static create(): ApiInvitations {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["InvitationsCreate"]["Client"]["CreateInvitationBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/invitations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.InvitationsCreate.CreateInvitationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/invitations`,
      });
    }

    return ApiSchema.InvitationsCreate.CreateInvitationResponseSchema.parse(await response.json());
  };

  delete = async ({ invitationId }: ApiInvitationsWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/invitations/${invitationId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /invitations/${invitationId}`,
      });
    }
  };

  preview = async ({
    token,
  }: ApiInvitationsTokenArgs): Promise<
    Api["InvitationsPreview"]["Client"]["PreviewInvitationResponse"]
  > => {
    const response = await this.#postToken({ path: "/invitations/preview", token });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot post /invitations/preview" });
    }

    return ApiSchema.InvitationsPreview.PreviewInvitationResponseSchema.parse(
      await response.json(),
    );
  };

  accept = async ({
    token,
  }: ApiInvitationsTokenArgs): Promise<
    Api["InvitationsAccept"]["Client"]["AcceptInvitationResponse"]
  > => {
    const response = await this.#postToken({ path: "/invitations/accept", token });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot post /invitations/accept" });
    }

    return ApiSchema.InvitationsAccept.AcceptInvitationResponseSchema.parse(await response.json());
  };

  decline = async ({ token }: ApiInvitationsTokenArgs): Promise<void> => {
    const response = await this.#postToken({ path: "/invitations/decline", token });

    if (!response.ok) {
      return await this.throwError({ response, message: "Cannot post /invitations/decline" });
    }
  };

  #postToken = ({ path, token }: { path: string } & ApiInvitationsTokenArgs): Promise<Response> =>
    fetch(`${this.apiUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Invitations.InvitationTokenRequestSchema,
        body: { token },
      }),
    });
}
