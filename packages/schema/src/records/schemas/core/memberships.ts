import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { MembershipsSchema } from "../../../db/schemas/core/memberships";
import {
  INSERT_OMIT_FIELDS,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

export const SelectMembershipsSchema = createSelectSchema(MembershipsSchema);
export const InsertMembershipsSchema =
  createInsertSchema(MembershipsSchema).omit(INSERT_OMIT_FIELDS);
export const UpdateMembershipsSchema = createUpdateSchema(MembershipsSchema)
  .omit({
    ...UPDATE_OMIT_FIELDS,
    organizationId: true,
    userId: true,
  })
  .required(UPDATE_REQUIRED_FIELDS);
