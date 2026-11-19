import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { MembershipsSchema } from "../../../db/schemas/core/memberships";
import {
  INSERT_OMIT_FIELDS,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import { MembershipRole } from "../../../db";

// Drizzle does not correctly infer the enum
export const refineMembershipRoleEnums = {
  role: z.enum(MembershipRole),
};

export const SelectMembershipsSchema = createSelectSchema(
  MembershipsSchema,
  refineMembershipRoleEnums,
);
export const InsertMembershipsSchema = createInsertSchema(
  MembershipsSchema,
  refineMembershipRoleEnums,
).omit(INSERT_OMIT_FIELDS);
export const UpdateMembershipsSchema = createUpdateSchema(
  MembershipsSchema,
  refineMembershipRoleEnums,
)
  .omit({
    ...UPDATE_OMIT_FIELDS,
    organizationId: true,
    userId: true,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
