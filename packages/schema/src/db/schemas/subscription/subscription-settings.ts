import { SubscriptionSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { planIdReference } from "./plans";
import { singleRowPrimaryKey, singleRowRules } from "../_common";

export const SubscriptionSettingsSchema = SubscriptionSchema.table(
  "subscription_settings",
  {
    id: singleRowPrimaryKey(),
    initialPlanId: planIdReference(),
    graceDays: pg.integer().notNull().default(7),
  },
  (table) => [
    ...singleRowRules({ tableName: "subscription_settings", table }),
    pg.check("subscription_settings_grace_days_non_negative", sql`${table.graceDays} >= 0`),
    ...readonlyPolicies({ tableName: "subscription_settings" }),
  ],
);
