import { SubscriptionSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { planIdReference } from "./plans";

export const SubscriptionSettingsSchema = SubscriptionSchema.table(
  "subscription_settings",
  {
    id: pg.integer().primaryKey().default(1),
    initialPlanId: planIdReference(),
    graceDays: pg.integer().notNull().default(7),
  },
  (table) => [
    pg.check("subscription_settings_single_row", sql`${table.id} = 1`),
    pg.check("subscription_settings_grace_days_non_negative", sql`${table.graceDays} >= 0`),
    ...readonlyPolicies({ tableName: "subscription_settings" }),
  ],
);
