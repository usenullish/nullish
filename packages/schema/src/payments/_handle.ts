import type { Option } from "@usenullish/nullish-common";
import type { z } from "zod";
import type { PaymentsSchema } from "./_schemas";

type HandlePaymentsArgs = z.infer<typeof PaymentsSchema.HandlePaymentsArgsSchema>;
type PaymentSubscription = z.infer<typeof PaymentsSchema.PaymentSchema>;

export interface HandlePayments {
  handle(args: HandlePaymentsArgs): Promise<Option<PaymentSubscription>>;
}
