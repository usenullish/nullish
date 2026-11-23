import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

const CONSTRAINT = "plan_rules_max_members_positive";

describe("plan_rules_max_members_positive", () => {
  const planRulesIds: string[] = [];

  const insertPlanRules = async (values: typeof planRules.$inferInsert) => {
    const rows = await db.insert(planRules).values(values).returning();
    planRulesIds.push(...rows.map(({ id }) => id));
    return rows;
  };

  afterAll(async () => {
    await db.delete(planRules).where(inArray(planRules.id, planRulesIds));
    await client.close();
  });

  test("allows rules with one member", async () => {
    const [rules] = await insertPlanRules({ maxMembers: 1 });

    expect(rules?.maxMembers).toBe(1);
  });

  test.each([0, -1])("rejects rules with %d members", async (maxMembers) => {
    const error = await insertPlanRules({ maxMembers }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });
});
