import { TimestampCodec } from "@usenullish/nullish-common";
import * as z from "zod";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";

export const InvitationSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema,
).extend({
  expiresAt: TimestampCodec,
});

export const GetInvitationsResponseSchema = z.strictObject({
  invitations: z.array(InvitationSchema),
});

export const InvitationTokenRequestSchema = z.strictObject({
  token: z.string().min(1),
});
