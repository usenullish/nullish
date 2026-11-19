import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { date } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionProvider } from "./provider";

export const SubscriptionTaxRatesSchema = SubscriptionSchema.table(
  "subscription_tax_rates",
  {
    id: primaryKey(),
    provider: subscriptionProvider().notNull(),
    externalTaxRateId: pg.text().notNull(),
    startOn: date().notNull(),
    endOn: date(),
  },
  (table) => [
    pg.uniqueIndex("subscription_tax_rates_provider_start_uidx").on(table.provider, table.startOn),
    pg.check(
      "subscription_tax_rates_end_after_start",
      sql`${table.endOn} IS NULL OR ${table.endOn} >= ${table.startOn}`,
    ),
    // No explicit policies on purpose: like the subscription references, users never access this table.
    // Their permissions are revoked in the custom migration permission_subscription_tax_rates.sql
  ],
);
