import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { subscriptionProviderReference } from "./subscription-providers";
import { SubscriptionsSchema } from "./subscriptions";

export const SubscriptionReferencesSchema = SubscriptionSchema.table(
  "subscription_references",
  {
    id: primaryKey(),
    subscriptionId: pg
      .uuid()
      .references(() => SubscriptionsSchema.id, { onDelete: "cascade" })
      .notNull(),
    provider: subscriptionProviderReference(),
    externalCustomerId: pg.text().notNull(),
    externalSubscriptionId: pg.text().notNull(),
  },
  (table) => [
    pg.uniqueIndex("subscription_references_subscription_uidx").on(table.subscriptionId),
    pg
      .uniqueIndex("subscription_references_provider_external_subscription_uidx")
      .on(table.provider, table.externalSubscriptionId),
    // No explicit policies on purpose: like the auth tables, users never access this table. Their permissions
    // are revoked in the custom migration permission_subscription_references.sql
  ],
);
