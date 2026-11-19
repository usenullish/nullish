import type { ProcessPayments } from "@usenullish/nullish-schema/payments";

interface Factory<T> {
  create(): T;
}

export function PaymentFactory(_constructor: Factory<ProcessPayments>) {}
