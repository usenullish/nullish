import * as z from "zod";
import { BigIntCodec } from "@usenullish/nullish-common";
import { PaymentsSchema } from "../../payments";

export const ExternalPlanPriceSchema = PaymentsSchema.PaymentPlanPriceSchema.extend({
  amount: BigIntCodec,
});

export const ExternalPlanSchema = PaymentsSchema.PaymentPlanSchema.extend({
  prices: z.array(ExternalPlanPriceSchema).min(1),
});

export const GetExternalPlansResponseSchema = z.strictObject({
  externalPlans: z.array(ExternalPlanSchema),
});
