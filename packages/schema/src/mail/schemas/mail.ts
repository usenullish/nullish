import * as z from "zod";
import { MailType } from "../constants";

export const SendVerifyEmailArgsSchema = z.strictObject({
  type: z.literal(MailType.VERIFY_EMAIL),
  to: z.email(),
  url: z.url(),
});

export const SendResetPasswordArgsSchema = z.strictObject({
  type: z.literal(MailType.RESET_PASSWORD),
  to: z.email(),
  url: z.url(),
});

export const SendInvitationArgsSchema = z.strictObject({
  type: z.literal(MailType.INVITATION),
  to: z.email(),
  url: z.url(),
});

export const SendMailArgsSchema = z.discriminatedUnion("type", [
  SendVerifyEmailArgsSchema,
  SendResetPasswordArgsSchema,
  SendInvitationArgsSchema,
]);
