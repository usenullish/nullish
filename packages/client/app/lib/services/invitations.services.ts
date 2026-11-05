import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiInvitationsSsr } from "~/lib/api/invitations.ssr.api";
import { ApiInvitations } from "~/lib/api/invitations.api";
import type { ApiInvitationsTokenArgs, ApiInvitationsWritableArgs } from "~/lib/api/_invitations";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class InvitationsService extends Service {
  private constructor() {
    super();
  }

  static create(): InvitationsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["Invitations"]["Client"]["GetInvitationsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiInvitationsSsr.create({ cookie }).list(rest);
    });
  };

  submit = async ({
    organizationId,
    invitation,
  }: {
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
    invitation: Api["InvitationsCreate"]["Client"]["CreateInvitationBody"];
  }): Promise<Result<Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiInvitations.create().submit({ orgId: organizationId, body: invitation });
    });
  };

  delete = async ({ invitationId }: ApiInvitationsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiInvitations.create().delete({ invitationId });
    });
  };

  preview = async ({
    token,
  }: ApiInvitationsTokenArgs): Promise<
    Result<Api["InvitationsPreview"]["Client"]["PreviewInvitationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiInvitations.create().preview({ token });
    });
  };

  accept = async ({
    token,
  }: ApiInvitationsTokenArgs): Promise<
    Result<Api["InvitationsAccept"]["Client"]["AcceptInvitationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiInvitations.create().accept({ token });
    });
  };

  decline = async ({ token }: ApiInvitationsTokenArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiInvitations.create().decline({ token });
    });
  };
}
