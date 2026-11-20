import { PaymentsSchema } from "../../payments";

export const CheckoutPaymentsRequestSchema = PaymentsSchema.CheckoutPaymentsArgsSchema.pick({
  priceId: true,
  billingPeriod: true,
});

export const CheckoutPaymentsResponseSchema = PaymentsSchema.PaymentCheckoutSchema;
