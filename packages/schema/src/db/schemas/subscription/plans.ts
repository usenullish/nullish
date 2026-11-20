import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { subscriptionProvider } from "./provider";

export const PlansSchema = SubscriptionSchema.table(
  "plans",
  {
    id: primaryKey(),
    trialDays: pg.integer(),
    expiresAt: timestamp(),
    provider: subscriptionProvider().notNull(),
    externalProductId: pg.text(),
  },
  (table) => [
    pg.check("plans_trial_days_positive", sql`${table.trialDays} >= 1`),
    pg.unique("plans_id_provider_unique").on(table.id, table.provider),
    pg.check(
      "plans_provider_external_product",
      sql`(${table.provider} = 'self') = (${table.externalProductId} IS NULL)`,
    ),
    pg
      .uniqueIndex("plans_provider_external_product_uidx")
      .on(table.provider, table.externalProductId),
    ...readonlyPolicies({ tableName: "plans" }),
  ],
);

export const planIdReference = () =>
  pg
    .uuid()
    .references(() => PlansSchema.id)
    .notNull();
