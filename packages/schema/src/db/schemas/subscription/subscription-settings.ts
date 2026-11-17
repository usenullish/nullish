import { SubscriptionSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { claimIdReference } from "./claims";

export const SubscriptionSettingsSchema = SubscriptionSchema.table(
  "subscription_settings",
  {
    id: pg.integer().primaryKey().default(1),
    initialClaimId: claimIdReference(),
  },
  (table) => [
    pg.check("subscription_settings_single_row", sql`${table.id} = 1`),
    ...readonlyPolicies({ tableName: "subscription_settings" }),
  ],
);
