import type { z } from "zod";
import type { HandlePaymentEvent } from "./_handle";
import type { PaymentsSchema } from "./_schemas";

interface Payments {
  Handle: {
    Args: z.infer<typeof PaymentsSchema.HandlePaymentEventArgsSchema>;
  };
  Payment: z.infer<typeof PaymentsSchema.PaymentSchema>;
  PaymentExternalIds: z.infer<
    typeof PaymentsSchema.PaymentExternalIdsSchema
  >;
}

export type { HandlePaymentEvent, Payments };
