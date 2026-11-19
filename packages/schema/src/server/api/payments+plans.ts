import * as z from "zod";
import { BigIntCodec } from "@usenullish/nullish-common";
import { PaymentsSchema } from "../../payments";

export const PlanPriceSchema = PaymentsSchema.PaymentPlanPriceSchema.extend({
  amount: BigIntCodec,
});

export const PlanSchema = PaymentsSchema.PaymentPlanSchema.extend({
  prices: z.array(PlanPriceSchema).min(1),
});

export const GetPlansResponseSchema = z.strictObject({
  plans: z.array(PlanSchema),
});
