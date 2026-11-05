import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { DatasetsSchema } from "../../../db/schemas/migration/datasets";
import { MigrationDatasetType } from "../../../db/constants/migrations";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

const refineDatasetsEnums = {
  type: z.enum(MigrationDatasetType),
};

export const SelectDatasetsSchema = createSelectSchema(DatasetsSchema, refineDatasetsEnums).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  migrationId: true,
});
export const InsertDatasetsSchema = createInsertSchema(DatasetsSchema, refineDatasetsEnums).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
  migrationId: true,
});
export const UpdateDatasetsSchema = createUpdateSchema(DatasetsSchema, refineDatasetsEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    migrationId: true,
    type: true,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
