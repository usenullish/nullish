import { InstanceSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { InitialSubscriptionStatus } from "../../constants/subscriptions";

export const initialSubscriptionStatus = InstanceSchema.enum(
  "initial_subscription_status",
  InitialSubscriptionStatus,
);

export const OrganizationRulesSchema = InstanceSchema.table(
  "organization_rules",
  {
    id: pg.integer().primaryKey().default(1),
    initialSubscriptionStatus: initialSubscriptionStatus()
      .notNull()
      .default(InitialSubscriptionStatus.ACTIVE),
  },
  (table) => [pg.check("organization_rules_single_row", sql`${table.id} = 1`)],
);
