import * as z from "zod";
import { MailType } from "../constants";
import { DefaultTemplateLanguage } from "../../db/constants/documents";
import { SelectOrganizationsSchema } from "../../records/schemas/core/organizations";
import { SelectInvitationsSchema } from "../../records/schemas/core/invitations";
import { SelectUsersSchema } from "../../records/schemas/auth/users";

const SendLinkArgsSchema = z.strictObject({
  to: z.email(),
  lang: z.enum(DefaultTemplateLanguage),
  url: z.url(),
});

export const SendVerifyEmailArgsSchema = z.strictObject({
  type: z.literal(MailType.VERIFY_EMAIL),
  ...SendLinkArgsSchema.shape,
});

export const SendResetPasswordArgsSchema = z.strictObject({
  type: z.literal(MailType.RESET_PASSWORD),
  ...SendLinkArgsSchema.shape,
});

export const SendInvitationArgsSchema = z.strictObject({
  type: z.literal(MailType.INVITATION),
  ...SendLinkArgsSchema.shape,
  organization: SelectOrganizationsSchema.pick({ name: true }),
  invitation: SelectInvitationsSchema.pick({ expiresAt: true }),
  invitedBy: SelectUsersSchema.pick({ name: true, email: true }),
});

export const SendMailArgsSchema = z.discriminatedUnion("type", [
  SendVerifyEmailArgsSchema,
  SendResetPasswordArgsSchema,
  SendInvitationArgsSchema,
]);

export const DeliverMailArgsSchema = z.strictObject({
  to: SendLinkArgsSchema.shape.to,
  subject: z.string().trim().min(1),
  html: z.string().min(1),
  text: z.string().min(1),
});
