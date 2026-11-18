import { SubscriptionSchema } from "./_schema";
import { SubscriptionProvider } from "../../constants/subscriptions";

export const subscriptionProvider = SubscriptionSchema.enum(
  "subscription_provider",
  SubscriptionProvider,
);
