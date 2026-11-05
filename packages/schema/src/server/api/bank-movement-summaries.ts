import * as z from "zod";
import {
  BankMovementSchema,
  GetBankMovementsFiltersQuerySchema,
  GetBankMovementsFiltersSchema,
} from "./bank-movements";
import { InvoiceSummarySchema } from "./invoice-summaries";

export const BankMovementSummarySchema = z.strictObject({
  movement: BankMovementSchema,
  suggestedInvoice: InvoiceSummarySchema.nullable(),
});

export const GetBankMovementSummariesResponseSchema = z.strictObject({
  bankMovementSummaries: z.array(BankMovementSummarySchema),
});

export const GetBankMovementSummariesFiltersSchema = GetBankMovementsFiltersSchema;
export const GetBankMovementSummariesFiltersQuerySchema = GetBankMovementsFiltersQuerySchema;
