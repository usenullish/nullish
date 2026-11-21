import type { z } from "zod";
import type { ProcessPayments } from "./_process";
import type { PaymentsSchema } from "./_schemas";

interface Payments {
  Handle: {
    Args: z.infer<typeof PaymentsSchema.HandlePaymentsArgsSchema>;
  };
  Checkout: {
    Args: z.infer<typeof PaymentsSchema.CheckoutPaymentsArgsSchema>;
    Result: z.infer<typeof PaymentsSchema.PaymentCheckoutSchema>;
  };
  Manage: {
    Args: z.infer<typeof PaymentsSchema.ManagePaymentsArgsSchema>;
    Result: z.infer<typeof PaymentsSchema.PaymentManageSchema>;
  };
  Plan: z.infer<typeof PaymentsSchema.PaymentPlanSchema>;
  PlanPrice: z.infer<typeof PaymentsSchema.PaymentPlanPriceSchema>;
  Payment: z.infer<typeof PaymentsSchema.PaymentSchema>;
  Invoice: z.infer<typeof PaymentsSchema.PaymentInvoiceSchema>;
  ExternalIds: z.infer<typeof PaymentsSchema.PaymentExternalIdsSchema>;
}

export type { Payments, ProcessPayments };
