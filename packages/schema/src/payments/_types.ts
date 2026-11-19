import type { z } from "zod";
import type { CheckoutPayments } from "./_checkout";
import type { HandlePayments } from "./_handle";
import type { PaymentsSchema } from "./_schemas";

interface Payments {
  Handle: {
    Args: z.infer<typeof PaymentsSchema.HandlePaymentsArgsSchema>;
  };
  Checkout: {
    Args: z.infer<typeof PaymentsSchema.CheckoutPaymentsArgsSchema>;
    Result: z.infer<typeof PaymentsSchema.PaymentCheckoutSchema>;
  };
  Payment: z.infer<typeof PaymentsSchema.PaymentSchema>;
  PaymentExternalIds: z.infer<typeof PaymentsSchema.PaymentExternalIdsSchema>;
}

export type { CheckoutPayments, HandlePayments, Payments };
