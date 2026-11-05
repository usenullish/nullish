import { createSelectSchema } from "drizzle-orm/zod";
import { OrganizationMembersView } from "../../../db/views/core/organization-members";

export const SelectOrganizationMembersView = createSelectSchema(OrganizationMembersView);
