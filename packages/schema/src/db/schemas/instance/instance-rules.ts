import { InstanceSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { singleRowPrimaryKey, singleRowRules } from "../_common";

export const InstanceRulesSchema = InstanceSchema.table(
  "instance_rules",
  {
    id: singleRowPrimaryKey(),
    maxOrganizations: pg.integer(),
    maxMembers: pg.integer(),
  },
  (table) => [
    ...singleRowRules({ tableName: "instance_rules", table }),
    pg.check("instance_rules_max_organizations_positive", sql`${table.maxOrganizations} >= 1`),
    pg.check("instance_rules_max_members_positive", sql`${table.maxMembers} >= 1`),
    ...readonlyPolicies({ tableName: "instance_rules" }),
  ],
);
