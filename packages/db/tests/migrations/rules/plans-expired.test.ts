import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
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

const DAY_MS = 24 * 60 * 60 * 1000;

const insertPlan = async (expiresAt: Date): Promise<string> => {
  const [plan] = await db
    .insert(plans)
    .values({ provider: SubscriptionProvider.SELF, expiresAt })
    .returning();
  assertNonNullish(plan);
  return plan.id;
};

describe("check_plan_not_expired", () => {
  let organizationId: string;
  let expiredPlanId: string;
  let openPlanId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);
    expiredPlanId = await insertPlan(new Date(Date.now() - DAY_MS));
    openPlanId = await insertPlan(new Date(Date.now() + DAY_MS));
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(plans).where(eq(plans.id, expiredPlanId));
    await db.delete(plans).where(eq(plans.id, openPlanId));
    await client.close();
  });

  test("rejects putting a subscription on an expired plan", async () => {
    const error = await db
      .update(subscriptions)
      .set({ planId: expiredPlanId })
      .where(eq(subscriptions.organizationId, organizationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has expired");
  });

  test("allows putting a subscription on a plan that has not expired yet", async () => {
    const [subscription] = await db
      .update(subscriptions)
      .set({ planId: openPlanId })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    expect(subscription?.planId).toBe(openPlanId);
  });

  test("rejects making an expired plan the initial plan", async () => {
    const error = await db
      .update(subscriptionSettings)
      .set({ initialPlanId: expiredPlanId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has expired");
  });
});
