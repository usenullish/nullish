import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

const subscriptionsOf = (organizationId: string) =>
  db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));

describe("seed_subscription_for_organization", () => {
  let initialClaimId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialClaimId = settings.initialClaimId;
  });

  afterEach(async () => {
    await db.update(claims).set({ trialDays: null }).where(eq(claims.id, initialClaimId));
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("creates an active subscription on the initial claim without end", async () => {
    const organizationId = await createOrganization(db);

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.claimId).toBe(initialClaimId);
    expect(rows[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(rows[0]?.periodEnd).toBeNull();
  });

  test("creates a trialing subscription ending after the trial of the initial claim", async () => {
    await db.update(claims).set({ trialDays: 14 }).where(eq(claims.id, initialClaimId));

    const before = Date.now();
    const organizationId = await createOrganization(db);
    const after = Date.now();

    const [subscription] = await subscriptionsOf(organizationId);
    const periodEnd = subscription?.periodEnd?.getTime() ?? 0;

    expect(subscription?.status).toBe(SubscriptionStatus.TRIALING);
    expect(periodEnd).toBeGreaterThanOrEqual(before + 14 * DAY_MS - 1000);
    expect(periodEnd).toBeLessThanOrEqual(after + 14 * DAY_MS + 1000);
  });
});
