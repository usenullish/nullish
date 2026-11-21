import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
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
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const insertPlan = async (values: typeof plans.$inferInsert): Promise<string> => {
  const [plan] = await db.insert(plans).values(values).returning();
  assertNonNullish(plan);
  return plan.id;
};

describe("check_initial_plan_self", () => {
  let initialPlanId: string;
  let stripePlanId: string;
  let customPlanId: string;
  let selfPlanId: string;

  beforeAll(async () => {
    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialPlanId = settings.initialPlanId;

    stripePlanId = await insertPlan({ provider: SubscriptionProvider.STRIPE });
    customPlanId = await insertPlan({ provider: SubscriptionProvider.CUSTOM });
    selfPlanId = await insertPlan({ provider: SubscriptionProvider.SELF, trialDays: 14 });
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ initialPlanId });
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [stripePlanId, customPlanId, selfPlanId]));
    await client.close();
  });

  test("rejects making a stripe plan the initial plan", async () => {
    const error = await db
      .update(subscriptionSettings)
      .set({ initialPlanId: stripePlanId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be the initial plan");
  });

  test("rejects making a custom plan the initial plan", async () => {
    const error = await db
      .update(subscriptionSettings)
      .set({ initialPlanId: customPlanId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be the initial plan");
  });

  test("allows making a self plan the initial plan", async () => {
    const [settings] = await db
      .update(subscriptionSettings)
      .set({ initialPlanId: selfPlanId })
      .returning();

    expect(settings?.initialPlanId).toBe(selfPlanId);
  });
});
