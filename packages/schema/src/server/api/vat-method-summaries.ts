import * as z from "zod";
import { VatMethodsResponseSchema } from "./vat+methods";
import { PeriodsResponseSchema } from "./periods";

export const VatMethodSummarySchema = z.strictObject({
  vatMethod: VatMethodsResponseSchema,
  period: PeriodsResponseSchema,
});

export const GetVatMethodSummariesResponseSchema = z.strictObject({
  vatMethodSummaries: z.array(VatMethodSummarySchema),
});
