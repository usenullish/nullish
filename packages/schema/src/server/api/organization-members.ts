import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { ViewsSchema } from "../../views";
import { withAuditFieldsCodecs } from "./_audit";

export const OrganizationMemberSchema = withAuditFieldsCodecs(
  ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
);

export const GetOrganizationMembersResponseSchema = z.strictObject({
  data: z.array(OrganizationMemberSchema),
  pagination: PaginationResponseSchema.optional(),
});
