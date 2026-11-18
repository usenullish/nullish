import { nonNullish, type Nullish } from "@usenullish/nullish-common";
import type { HandlePayments } from "@usenullish/nullish-schema/payments";
import type { App } from "../types/app";
import type { Webhook } from "./_factories/webhook";
import { PaymentsWebhook } from "./_payments";

export const initWebhooks = ({
  app,
  payments,
}: {
  app: App;
  payments: Nullish<HandlePayments>;
}): Webhook[] => (nonNullish(payments) ? [PaymentsWebhook.create({ app, payments })] : []);
