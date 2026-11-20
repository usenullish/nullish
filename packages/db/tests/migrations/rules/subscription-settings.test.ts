import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers, TEST_USER_ID } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

describe("subscription.subscription_settings", () => {
  let initialPlanId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialPlanId = settings.initialPlanId;
  });

  afterAll(async () => {
    await client.close();
  });

  test("holds a single row pointing to an initial plan without trial", async () => {
    const rows = await db
      .select({ id: subscriptionSettings.id, trialDays: plans.trialDays })
      .from(subscriptionSettings)
      .innerJoin(plans, eq(plans.id, subscriptionSettings.initialPlanId));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.trialDays).toBeNull();
  });

  test("grants a grace period of 7 days by default", async () => {
    const [settings] = await db.select().from(subscriptionSettings);

    expect(settings?.graceDays).toBe(7);
  });

  test("rejects a negative grace period", async () => {
    const error = await db
      .update(subscriptionSettings)
      .set({ graceDays: -1 })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_settings_grace_days_non_negative");
  });

  test("rejects a second row", async () => {
    const error = await db
      .insert(subscriptionSettings)
      .values({ id: 1, initialPlanId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_settings_pkey");
  });

  test("rejects a row with another id", async () => {
    const error = await db
      .insert(subscriptionSettings)
      .values({ id: 2, initialPlanId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_settings_single_row");
  });

  test("rejects deleting the row", async () => {
    const error = await db.delete(subscriptionSettings).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("The subscription settings cannot be deleted");
  });

  test("rejects truncating the table", async () => {
    const error = await db
      .execute(sql`TRUNCATE subscription.subscription_settings`)
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("The subscription settings cannot be deleted");
  });

  test("rejects deleting the initial plan", async () => {
    const error = await db
      .delete(plans)
      .where(eq(plans.id, initialPlanId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_settings_initial_plan_id_plans_id_fkey");
  });

  test("lets a user read the settings", async () => {
    const rows = await asUser((tx) => tx.select().from(subscriptionSettings));

    expect(rows).toHaveLength(1);
  });

  test("rejects a user writing the settings", async () => {
    const error = await asUser((tx) => tx.update(subscriptionSettings).set({ id: 1 })).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("permission denied");
  });
});
