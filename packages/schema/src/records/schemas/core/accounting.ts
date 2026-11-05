import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { AccountingSettingsSchema } from "../../../db/schemas/core/accounting";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

export const SelectAccountingSettingsSchema = createSelectSchema(AccountingSettingsSchema);
export const InsertAccountingSettingsSchema = createInsertSchema(AccountingSettingsSchema).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateAccountingSettingsSchema = createUpdateSchema(AccountingSettingsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .required(UPDATE_REQUIRED_FIELDS);
