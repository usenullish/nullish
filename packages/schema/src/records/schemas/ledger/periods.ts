import { createSelectSchema, createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";
import { PeriodsSchema } from "../../../db/schemas/ledger/periods";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { PeriodStatus } from "../../../db";

// Drizzle does not correctly infer the enum
const refinePeriodStatusEnums = {
  status: z.enum(PeriodStatus),
};

export const SelectPeriodsSchema = createSelectSchema(PeriodsSchema, refinePeriodStatusEnums);
export const InsertPeriodsSchema = createInsertSchema(PeriodsSchema, refinePeriodStatusEnums).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdatePeriodsSchema = createUpdateSchema(PeriodsSchema, refinePeriodStatusEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterPeriodsSchema = z.strictObject({
  status: refinePeriodStatusEnums.status.optional(),
});
