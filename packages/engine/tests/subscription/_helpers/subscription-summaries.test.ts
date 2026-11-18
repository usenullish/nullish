import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { asc, eq } from "drizzle-orm";
import {
  DbSchema,
  OrganizationSubscriptionStatus,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { listSubscriptionSummaries } from "../../../src/subscription/_helpers/subscription-summaries";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const list = (organizationId: string) =>
  db.transaction((tx) =>
    listSubscriptionSummaries({
      tx,
      organizationId,
      orderBy: [asc(subscriptions.createdAt)],
      pagination: { limit: 100, offset: 0 },
    }),
  );

const updateSubscription = ({
  organizationId,
  values,
}: {
  organizationId: string;
  values: Partial<typeof subscriptions.$inferInsert>;
}) => db.update(subscriptions).set(values).where(eq(subscriptions.organizationId, organizationId));

describe("subscription/_helpers/subscription-summaries", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ graceDays: 7 });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns only the subscription of the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await createOrganization(db, TEST_USER_ID);

    const summaries = await list(organizationId);

    expect(summaries.map(({ subscription }) => subscription.organizationId)).toEqual([
      organizationId,
    ]);
  });

  test("returns an open organization without end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({
      status: OrganizationSubscriptionStatus.OPEN,
      expiresAt: null,
    });
  });

  test("returns an open organization until the end of its trial", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const periodEnd = new Date(Date.now() + DAY_MS);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.TRIALING, periodEnd },
    });

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({
      status: OrganizationSubscriptionStatus.OPEN,
      expiresAt: periodEnd,
    });
  });

  test("adds the grace days of the settings to the end in grace", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const periodEnd = new Date(Date.now() - DAY_MS);

    await db.update(subscriptionSettings).set({ graceDays: 10 });
    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.PAST_DUE, periodEnd },
    });

    const [summary] = await list(organizationId);

    if (summary?.organization.status !== OrganizationSubscriptionStatus.GRACE) {
      expect(true).toBeFalse();
      return;
    }

    const expected = periodEnd.getTime() + 10 * DAY_MS;

    expect(Math.abs(summary.organization.expiresAt.getTime() - expected)).toBeLessThanOrEqual(
      HOUR_MS,
    );
  });

  test("returns a locked organization without date", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.INACTIVE },
    });

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({ status: OrganizationSubscriptionStatus.LOCKED });
  });
});
