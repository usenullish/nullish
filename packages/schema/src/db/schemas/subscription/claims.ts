import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";

export const ClaimsSchema = SubscriptionSchema.table(
  "claims",
  {
    id: primaryKey(),
    onboarding: pg.boolean().notNull().default(false),
    trialDays: pg.integer(),
  },
  (table) => [
    pg.check("claims_trial_days_positive", sql`${table.trialDays} >= 1`),
    pg
      .uniqueIndex("claims_onboarding_uidx")
      .on(table.onboarding)
      .where(sql`${table.onboarding}`),
    ...readonlyPolicies({ tableName: "claims" }),
  ],
);

export const claimIdReference = () =>
  pg
    .uuid()
    .references(() => ClaimsSchema.id)
    .notNull();
