import { InstanceSchema } from "./_schema";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionStatus } from "../core/subscriptions";
import { SubscriptionStatus } from "../../constants/subscriptions";

export const OrganizationRulesSchema = InstanceSchema.table(
  "organization_rules",
  {
    id: pg.integer().primaryKey().default(1),
    initialSubscriptionStatus: subscriptionStatus().notNull().default(SubscriptionStatus.ACTIVE),
    ...auditFields(),
  },
  (table) => [
    pg.check("organization_rules_single_row", sql`${table.id} = 1`),
    pg.check(
      "organization_rules_initial_subscription_status",
      sql`${table.initialSubscriptionStatus} IN ('active', 'pending')`,
    ),
  ],
);
