import * as z from "zod";
import { RecordsSchema } from "../../records";
import { SelectInvoiceSummariesSchema } from "./invoice-summaries";

export const SelectMovementSummariesSchema = z.strictObject({
  movement: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
  suggestedInvoice: SelectInvoiceSummariesSchema.nullable(),
});

export const FilterMovementSummariesSchema =
  RecordsSchema.Banking.MovementsSchema.FilterMovementsSchema;
