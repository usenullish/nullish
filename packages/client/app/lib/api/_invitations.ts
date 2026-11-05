import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiInvitationsWritableArgs {
  invitationId: Api["Invitations"]["Client"]["Invitation"]["id"];
}

export interface ApiInvitationsTokenArgs {
  token: Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"]["token"];
}
