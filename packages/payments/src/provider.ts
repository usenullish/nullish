import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import { StripePaymentProvider } from "./_stripe";

export const createPaymentProvider = (): Result<ProcessPayments> => {
  return tryCatchSync(() => {
    return StripePaymentProvider.create();
  });
};
