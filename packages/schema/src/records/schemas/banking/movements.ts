import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { MovementsSchema } from "../../../db/schemas/banking/movements";
import { INSERT_OMIT_FIELDS, UPDATE_REQUIRED_FIELDS } from "../../../primitives";
import { BankMovementStatus } from "../../../db";
import * as z from "zod";

// Drizzle does not correctly infer the enum
const refineMovementEnums = {
  status: z.enum(BankMovementStatus),
};

export const SelectMovementsSchema = createSelectSchema(MovementsSchema, refineMovementEnums);
export const InsertMovementsSchema = createInsertSchema(MovementsSchema, refineMovementEnums).omit({
  ...INSERT_OMIT_FIELDS,
  status: true,
});

export const FilterMovementsSchema = z.strictObject({
  status: refineMovementEnums.status.optional(),
  bookedOnFrom: SelectMovementsSchema.shape.bookedOn.optional(),
  bookedOnTo: SelectMovementsSchema.shape.bookedOn.optional(),
});

// Only the status of a movement changes once imported
export const UpdateMovementsSchema = createUpdateSchema(MovementsSchema, {
  status: z.enum(BankMovementStatus),
})
  .pick({ status: true, version: true })
  .required(UPDATE_REQUIRED_FIELDS);
