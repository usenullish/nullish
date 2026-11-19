import type { Option } from "@usenullish/nullish-common";
import type { z } from "zod";
import type { PaymentsSchema } from "./_schemas";

type HandlePaymentsArgs = z.infer<typeof PaymentsSchema.HandlePaymentsArgsSchema>;
type PaymentSubscription = z.infer<typeof PaymentsSchema.PaymentSchema>;
type CheckoutPaymentsArgs = z.infer<typeof PaymentsSchema.CheckoutPaymentsArgsSchema>;
type PaymentCheckout = z.infer<typeof PaymentsSchema.PaymentCheckoutSchema>;
type PaymentPlan = z.infer<typeof PaymentsSchema.PaymentPlanSchema>;

export interface ProcessPayments {
  handle(args: HandlePaymentsArgs): Promise<Option<PaymentSubscription>>;
  checkout(args: CheckoutPaymentsArgs): Promise<PaymentCheckout>;
  listPlans(): Promise<PaymentPlan[]>;
}
