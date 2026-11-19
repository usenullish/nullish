import type { z } from "zod";
import type { PaymentsSchema } from "./_schemas";

type CheckoutPaymentsArgs = z.infer<typeof PaymentsSchema.CheckoutPaymentsArgsSchema>;
type PaymentCheckout = z.infer<typeof PaymentsSchema.PaymentCheckoutSchema>;

export interface CheckoutPayments {
  checkout(args: CheckoutPaymentsArgs): Promise<PaymentCheckout>;
}
