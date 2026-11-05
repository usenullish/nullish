import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { MigrationsSchema } from "../../../db/schemas/migration/migrations";
import { MigrationProvider, MigrationStatus } from "../../../db/constants/migrations";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

const refineMigrationsEnums = {
  provider: z.enum(MigrationProvider),
  status: z.enum(MigrationStatus),
};

export const SelectMigrationsSchema = createSelectSchema(MigrationsSchema, refineMigrationsEnums);
export const InsertMigrationsSchema = createInsertSchema(
  MigrationsSchema,
  refineMigrationsEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
  userId: true,
  status: true,
});
export const UpdateMigrationsSchema = createUpdateSchema(MigrationsSchema, refineMigrationsEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    userId: true,
    provider: true,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
