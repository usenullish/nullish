import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import type { HandlePayments } from "@usenullish/nullish-schema/payments";
import { StripePaymentProvider } from "./_stripe";

export const createPaymentProvider = (): Result<HandlePayments> => {
  return tryCatchSync(() => {
    return StripePaymentProvider.create();
  });
};
