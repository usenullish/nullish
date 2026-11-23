import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { subscriptionProvider } from "./provider";
import { planRulesIdReference } from "./plan-rules";

export const PlansSchema = SubscriptionSchema.table(
  "plans",
  {
    id: primaryKey(),
    trialDays: pg.integer(),
    expiresAt: timestamp(),
    provider: subscriptionProvider().notNull(),
    planRulesId: planRulesIdReference(),
  },
  (table) => [
    pg.check("plans_trial_days_positive", sql`${table.trialDays} >= 1`),
    pg.check(
      "plans_trial_days_self",
      sql`${table.provider} = 'self' OR ${table.trialDays} IS NULL`,
    ),
    pg.check(
      "plans_rules_not_custom",
      sql`${table.provider} <> 'custom' OR ${table.planRulesId} IS NULL`,
    ),
    pg.unique("plans_id_provider_unique").on(table.id, table.provider),
    ...readonlyPolicies({ tableName: "plans" }),
  ],
);

export const planIdReference = () =>
  pg
    .uuid()
    .references(() => PlansSchema.id)
    .notNull();
