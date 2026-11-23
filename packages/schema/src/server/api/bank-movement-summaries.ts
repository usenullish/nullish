import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
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
  data: z.array(BankMovementSummarySchema),
  pagination: PaginationResponseSchema.optional(),
});

export const GetBankMovementSummariesFiltersSchema = GetBankMovementsFiltersSchema;
export const GetBankMovementSummariesFiltersQuerySchema = GetBankMovementsFiltersQuerySchema;
