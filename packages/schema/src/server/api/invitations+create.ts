import * as z from "zod";
import { RecordsSchema } from "../../records";
import { InvitationMailStatus } from "../constants/invitations";
import { InvitationSchema, InvitationTokenRequestSchema } from "./invitations";

export const CreateInvitationRequestSchema =
  RecordsSchema.Core.InvitationsSchema.InsertInvitationsSchema;
export const CreateInvitationResponseSchema = z.strictObject({
  invitation: InvitationSchema,
  token: InvitationTokenRequestSchema.shape.token,
  link: z.url(),
  mail: z.enum(InvitationMailStatus).nullable(),
});
