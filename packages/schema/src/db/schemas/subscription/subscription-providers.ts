import { SubscriptionSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { subscriptionProvider } from "./provider";

export const SubscriptionProvidersSchema = SubscriptionSchema.table(
  "subscription_providers",
  {
    provider: subscriptionProvider().primaryKey(),
    externalTaxRateId: pg.text(),
  },
  () => [
    // No explicit policies on purpose: like the subscription references, users never access this table.
    // Their permissions are revoked in the custom migration permission_subscription_providers.sql
  ],
);

export const subscriptionProviderReferenceOptional = () =>
  subscriptionProvider().references(() => SubscriptionProvidersSchema.provider);

export const subscriptionProviderReference = () =>
  subscriptionProviderReferenceOptional().notNull();
