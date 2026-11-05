import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const UsersSchema = withAuditFieldsCodecs(
  RecordsSchema.Auth.UsersSchema.SelectUsersSchema.extend({
    roles: z.array(
      RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema.pick({
        role: true,
        organizationId: true,
      }),
    ),
  }),
);
