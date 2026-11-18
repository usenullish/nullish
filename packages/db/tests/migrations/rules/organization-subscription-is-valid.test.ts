import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import type { Nullable } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY_MS);

describe("subscription.organization_subscription_is_valid", () => {
  let organizationId: string;

  const isValid = async (id: string): Promise<unknown> => {
    const [row] = await db.execute<{ valid: boolean }>(
      sql`SELECT subscription.organization_subscription_is_valid(${id}::uuid) AS valid`,
    );

    return row?.valid;
  };

  const setSubscription = ({
    status,
    periodEnd,
  }: {
    status: SubscriptionStatus;
    periodEnd: Nullable<Date>;
  }) =>
    db
      .update(subscriptions)
      .set({ status, periodEnd })
      .where(eq(subscriptions.organizationId, organizationId));

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ graceDays: 7 });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test.each([
    ["active without end", SubscriptionStatus.ACTIVE, null, true],
    ["active before its end", SubscriptionStatus.ACTIVE, 1, true],
    ["active after its end", SubscriptionStatus.ACTIVE, -1, false],
    ["past due without end", SubscriptionStatus.PAST_DUE, null, true],
    ["past due before its end", SubscriptionStatus.PAST_DUE, 1, true],
    ["past due within the grace days", SubscriptionStatus.PAST_DUE, -6, true],
    ["past due after the grace days", SubscriptionStatus.PAST_DUE, -8, false],
    ["inactive without end", SubscriptionStatus.INACTIVE, null, false],
    ["inactive before its end", SubscriptionStatus.INACTIVE, 1, false],
  ] as const)("%s", async (_name, status, days, expected) => {
    await setSubscription({ status, periodEnd: days === null ? null : daysFromNow(days) });

    expect(await isValid(organizationId)).toBe(expected);
  });

  test("extends the validity of a past due subscription with more grace days", async () => {
    await db.update(subscriptionSettings).set({ graceDays: 10 });
    await setSubscription({ status: SubscriptionStatus.PAST_DUE, periodEnd: daysFromNow(-8) });

    expect(await isValid(organizationId)).toBe(true);
  });

  test("ends the validity of a past due subscription at its end without grace days", async () => {
    await db.update(subscriptionSettings).set({ graceDays: 0 });
    await setSubscription({ status: SubscriptionStatus.PAST_DUE, periodEnd: daysFromNow(-1) });

    expect(await isValid(organizationId)).toBe(false);
  });

  test("is false for an organization without subscription", async () => {
    expect(await isValid(crypto.randomUUID())).toBe(false);
  });
});
