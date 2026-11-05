import * as z from "zod";
import { RecordsSchema } from "../../records";

export const AcceptInvitationResponseSchema = z.strictObject({
  membership: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema.pick({
    id: true,
    organizationId: true,
    role: true,
  }),
});
