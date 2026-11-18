import type { Option } from "@usenullish/nullish-common";
import type { z } from "zod";
import type { PaymentsSchema } from "./_schemas";

type HandlePaymentEventArgs = z.infer<typeof PaymentsSchema.HandlePaymentEventArgsSchema>;
type PaymentSubscription = z.infer<typeof PaymentsSchema.PaymentSchema>;

export interface HandlePaymentEvent {
  handle(args: HandlePaymentEventArgs): Promise<Option<PaymentSubscription>>;
}
