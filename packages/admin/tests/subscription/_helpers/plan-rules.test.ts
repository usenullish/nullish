import { afterAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { insertPlanRules } from "../../../src/subscription/_helpers/plan-rules";
import { openTestDb } from "../../_test-utils";

const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("insertPlanRules", () => {
  const insertedIds: string[] = [];

  afterAll(async () => {
    await db.delete(planRules).where(inArray(planRules.id, insertedIds));
    await instance.close();
  });

  test("inserts the rules and returns them", async () => {
    const rules = await db.transaction((tx) => insertPlanRules({ tx, rules: { maxMembers: 3 } }));

    insertedIds.push(rules.id);

    expect(rules.maxMembers).toBe(3);
  });

  test("throws for rules without any member allowed", async () => {
    await expect(
      db.transaction((tx) => insertPlanRules({ tx, rules: { maxMembers: 0 } })),
    ).rejects.toThrow();
  });
});
