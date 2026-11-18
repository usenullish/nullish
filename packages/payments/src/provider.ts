import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import type { HandlePaymentEvent } from "@usenullish/nullish-schema/payments";
import { StripePaymentProvider } from "./_stripe";

export const createPaymentProvider = (): Result<HandlePaymentEvent> => {
  return tryCatchSync(() => {
    return StripePaymentProvider.create();
  });
};
