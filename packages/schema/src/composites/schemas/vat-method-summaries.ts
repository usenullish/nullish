import * as z from "zod";
import { RecordsSchema } from "../../records";

export const SelectVatMethodSummariesSchema = z.strictObject({
  vatMethod: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
  period: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
});
