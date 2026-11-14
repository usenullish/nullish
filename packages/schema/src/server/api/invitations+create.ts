import * as z from "zod";
import { RecordsSchema } from "../../records";
import { DefaultTemplateLanguage } from "../../db/constants/documents";
import { InvitationMailStatus } from "../constants/invitations";
import { InvitationSchema, InvitationTokenRequestSchema } from "./invitations";

export const CreateInvitationRequestSchema =
  RecordsSchema.Core.InvitationsSchema.InsertInvitationsSchema.extend({
    language: z
      .enum(DefaultTemplateLanguage)
      .optional()
      .describe(
        "The language of the invitation email sent to the invited person, English if omitted",
      ),
  });
export const CreateInvitationResponseSchema = z.strictObject({
  invitation: InvitationSchema,
  token: InvitationTokenRequestSchema.shape.token,
  link: z.url(),
  mail: z.enum(InvitationMailStatus).nullable(),
});
