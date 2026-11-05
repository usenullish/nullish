import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { BillingSettingsSchema } from "../../../db/schemas/core/billing";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

export const SelectBillingSettingsSchema = createSelectSchema(BillingSettingsSchema);
export const InsertBillingSettingsSchema = createInsertSchema(BillingSettingsSchema).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateBillingSettingsSchema = createUpdateSchema(BillingSettingsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .required(UPDATE_REQUIRED_FIELDS);
