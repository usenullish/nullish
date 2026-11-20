import * as z from "zod";
import { RecordsSchema } from "../../records";

export const SelectCustomPlansSchema = z.strictObject({
  plan: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
  product: RecordsSchema.Subscription.CustomProductsSchema.SelectCustomProductsSchema,
  prices: z.array(RecordsSchema.Subscription.CustomPricesSchema.SelectCustomPricesSchema),
});
