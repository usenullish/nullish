import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";

export const PlanRulesSchema = SubscriptionSchema.table(
  "plan_rules",
  {
    id: primaryKey(),
    maxMembers: pg.integer().notNull(),
  },
  (table) => [
    pg.check("plan_rules_max_members_positive", sql`${table.maxMembers} >= 1`),
    ...readonlyPolicies({ tableName: "plan_rules" }),
  ],
);

export const planRulesIdReference = () => pg.uuid().references(() => PlanRulesSchema.id);
