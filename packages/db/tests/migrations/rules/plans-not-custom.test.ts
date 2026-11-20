import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const insertPlan = async (values: typeof plans.$inferInsert): Promise<string> => {
  const [plan] = await db.insert(plans).values(values).returning();
  assertNonNullish(plan);
  return plan.id;
};

describe("check_plan_not_custom", () => {
  let organizationId: string;
  let initialPlanId: string;
  let customPlanId: string;
  let stripePlanId: string;
  let selfPlanId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);

    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialPlanId = settings.initialPlanId;

    customPlanId = await insertPlan({ provider: SubscriptionProvider.CUSTOM });
    stripePlanId = await insertPlan({ provider: SubscriptionProvider.STRIPE });
    selfPlanId = await insertPlan({ provider: SubscriptionProvider.SELF, trialDays: 30 });
  });

  afterAll(async () => {
    await db.update(subscriptionSettings).set({ initialPlanId });
    await resetDb(db);
    await db.delete(plans).where(inArray(plans.id, [customPlanId, stripePlanId, selfPlanId]));
    await client.close();
  });

  test("rejects putting a subscription on a custom plan", async () => {
    const error = await db
      .update(subscriptions)
      .set({ planId: customPlanId })
      .where(eq(subscriptions.organizationId, organizationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is a custom plan");
  });

  test("allows putting a subscription on a stripe plan", async () => {
    const [subscription] = await db
      .update(subscriptions)
      .set({ planId: stripePlanId })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    expect(subscription?.planId).toBe(stripePlanId);
  });

  test("allows putting a subscription on a self plan", async () => {
    const [subscription] = await db
      .update(subscriptions)
      .set({ planId: selfPlanId })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    expect(subscription?.planId).toBe(selfPlanId);
  });
});
