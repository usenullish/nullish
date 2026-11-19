import type { App } from "../types/app";
import type { Webhook } from "./_factories/webhook";
import { PaymentsWebhook } from "./_payments";

export const initWebhooks = ({ app }: { app: App }): Webhook[] => [PaymentsWebhook.create({ app })];
