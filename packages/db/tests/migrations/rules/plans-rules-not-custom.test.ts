import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

const CONSTRAINT = "plans_rules_not_custom";

describe("plans_rules_not_custom", () => {
  const planIds: string[] = [];

  let planRulesId: string;

  const insertPlan = async (values: typeof plans.$inferInsert) => {
    const rows = await db.insert(plans).values(values).returning();
    planIds.push(...rows.map(({ id }) => id));
    return rows;
  };

  beforeAll(async () => {
    const [rules] = await db.insert(planRules).values({ maxMembers: 3 }).returning();
    assertNonNullish(rules);
    planRulesId = rules.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, planIds));
    await db.delete(planRules).where(inArray(planRules.id, [planRulesId]));
    await client.close();
  });

  test.each([SubscriptionProvider.SELF, SubscriptionProvider.STRIPE])(
    "allows a %s plan with rules",
    async (provider) => {
      const [plan] = await insertPlan({ provider, planRulesId });

      expect(plan?.planRulesId).toBe(planRulesId);
    },
  );

  test("rejects a custom plan with rules", async () => {
    const error = await insertPlan({ provider: SubscriptionProvider.CUSTOM, planRulesId }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("allows a custom plan without rules", async () => {
    const [plan] = await insertPlan({ provider: SubscriptionProvider.CUSTOM });

    expect(plan?.planRulesId).toBeNull();
  });
});
