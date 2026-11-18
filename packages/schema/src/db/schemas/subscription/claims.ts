import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";

export const ClaimsSchema = SubscriptionSchema.table(
  "claims",
  {
    id: primaryKey(),
    trialDays: pg.integer(),
    expiresAt: timestamp(),
    externalProductId: pg.text(),
  },
  (table) => [
    pg.check("claims_trial_days_positive", sql`${table.trialDays} >= 1`),
    pg.uniqueIndex("claims_external_product_uidx").on(table.externalProductId),
    ...readonlyPolicies({ tableName: "claims" }),
  ],
);

export const claimIdReference = () =>
  pg
    .uuid()
    .references(() => ClaimsSchema.id)
    .notNull();
