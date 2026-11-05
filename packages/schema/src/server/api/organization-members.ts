import * as z from "zod";
import { ViewsSchema } from "../../views";
import { withAuditFieldsCodecs } from "./_audit";

export const OrganizationMemberSchema = withAuditFieldsCodecs(
  ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
);

export const GetOrganizationMembersResponseSchema = z.strictObject({
  members: z.array(OrganizationMemberSchema),
});
