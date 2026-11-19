import { createSelectSchema } from "drizzle-orm/zod";
import { OrganizationMembersView } from "../../../db/views/core/organization-members";
import { refineMembershipRoleEnums } from "../../../records/schemas/core/memberships";

export const SelectOrganizationMembersView = createSelectSchema(
  OrganizationMembersView,
  refineMembershipRoleEnums,
);
