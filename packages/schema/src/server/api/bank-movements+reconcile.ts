import * as z from "zod";
import { ServicesSchema } from "../../services";
import { BankMovementSchema } from "./bank-movements";

export const ReconcileBankMovementRequestSchema =
  ServicesSchema.BankingSchema.ReconcileMovementArgsSchema;
export const ReconcileBankMovementWithAccountRequestSchema =
  ServicesSchema.BankingSchema.ReconcileMovementWithAccountArgsSchema;

export const ReconcileBankMovementResponseSchema = z.strictObject({
  bankMovement: BankMovementSchema,
});
