import * as z from "zod";
import { BigIntCodec, TimestampCodec } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";

const {
  PlansSchema: { SelectPlansSchema },
  CustomProductsSchema: { SelectCustomProductsSchema },
  CustomPricesSchema: { SelectCustomPricesSchema },
} = RecordsSchema.Subscription;

export const CustomPlanPriceSchema = SelectCustomPricesSchema.extend({
  amount: BigIntCodec,
});

export const CustomPlanSchema = z.strictObject({
  plan: SelectPlansSchema.extend({
    expiresAt: TimestampCodec.nullable(),
  }),
  product: SelectCustomProductsSchema,
  prices: z.array(CustomPlanPriceSchema),
});

export const GetCustomPlansResponseSchema = z.strictObject({
  customPlans: z.array(CustomPlanSchema),
});
