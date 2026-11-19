import { PaymentsSchema } from "../../payments";

export const CheckoutPaymentsRequestSchema = PaymentsSchema.CheckoutPaymentsArgsSchema.pick({
  priceId: true,
});

export const CheckoutPaymentsResponseSchema = PaymentsSchema.PaymentCheckoutSchema;
