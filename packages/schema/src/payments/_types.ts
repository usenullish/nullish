import type { z } from "zod";
import type { HandlePayments } from "./_handle";
import type { PaymentsSchema } from "./_schemas";

interface Payments {
  Handle: {
    Args: z.infer<typeof PaymentsSchema.HandlePaymentsArgsSchema>;
  };
  Payment: z.infer<typeof PaymentsSchema.PaymentSchema>;
  PaymentExternalIds: z.infer<typeof PaymentsSchema.PaymentExternalIdsSchema>;
}

export type { HandlePayments, Payments };
