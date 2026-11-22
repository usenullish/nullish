import { isNullish, type Nullable } from "@usenullish/nullish-common";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import type { App } from "../types/app";
import type { Webhook } from "./_factories/webhook";
import { PaymentsWebhook } from "./_payments";

export const initWebhooks = ({
  app,
  payments,
}: {
  app: App;
  payments: Nullable<ProcessPayments>;
}): Webhook[] => (isNullish(payments) ? [] : [PaymentsWebhook.create({ app, payments })]);
