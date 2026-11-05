import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { OrganizationsSchema } from "../../../db/schemas/core/organizations";
import {
  INSERT_OMIT_FIELDS,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { NotEmptyStringSchema } from "@usenullish/nullish-common";
import { AddressSchema } from "../_address";
import { CommunicationSchema } from "../_communication";
import { LegalForm } from "../../../db";

const OrganizationNameSchema = z.string().trim().min(3).max(255);

const refineOrganizationsEnums = {
  legalForm: z.enum(LegalForm),
};

export const SelectOrganizationsSchema = createSelectSchema(
  OrganizationsSchema,
  refineOrganizationsEnums,
);
export const InsertOrganizationsSchema = createInsertSchema(
  OrganizationsSchema,
  refineOrganizationsEnums,
)
  .omit({ ...INSERT_OMIT_FIELDS, deletedAt: true })
  .extend({
    name: OrganizationNameSchema,
    ...AddressSchema.shape,
    ...CommunicationSchema.shape,
  });
export const UpdateOrganizationsSchema = createUpdateSchema(OrganizationsSchema)
  .omit({
    ...UPDATE_OMIT_FIELDS,
    legalForm: true,
    deletedAt: true,
  })
  .extend({
    name: OrganizationNameSchema.optional(),
    ...AddressSchema.shape,
    ...CommunicationSchema.shape,
  })
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterOrganizationsSchema = z.strictObject({
  search: NotEmptyStringSchema.optional().describe(
    "Matches part of the name, email or city of the organization, case-insensitive, e.g. Acme",
  ),
});
