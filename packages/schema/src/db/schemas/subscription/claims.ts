import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";

export const ClaimsSchema = SubscriptionSchema.table(
  "claims",
  {
    id: primaryKey(),
    trialDays: pg.integer(),
  },
  (table) => [
    pg.check("claims_trial_days_positive", sql`${table.trialDays} >= 1`),
    ...readonlyPolicies({ tableName: "claims" }),
  ],
);

export const claimIdReference = () =>
  pg
    .uuid()
    .references(() => ClaimsSchema.id)
    .notNull();
