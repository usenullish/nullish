import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import type { Nullable } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const CONSTRAINT = "subscriptions_inactive_cancel_at";

describe("subscriptions_inactive_cancel_at", () => {
  let organizationId: string;

  const setSubscription = ({
    status,
    cancelAt,
  }: {
    status: SubscriptionStatus;
    cancelAt: Nullable<Date>;
  }) =>
    db
      .update(subscriptions)
      .set({ status, periodEnd: new Date(), cancelAt })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects an inactive subscription with a scheduled cancellation", async () => {
    const error = await setSubscription({
      status: SubscriptionStatus.INACTIVE,
      cancelAt: new Date(),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("allows an inactive subscription without scheduled cancellation", async () => {
    const [subscription] = await setSubscription({
      status: SubscriptionStatus.INACTIVE,
      cancelAt: null,
    });

    expect(subscription?.status).toBe(SubscriptionStatus.INACTIVE);
    expect(subscription?.cancelAt).toBeNull();
  });

  test.each([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE])(
    "allows a %s subscription with a scheduled cancellation",
    async (status) => {
      const cancelAt = new Date();

      const [subscription] = await setSubscription({ status, cancelAt });

      expect(subscription?.status).toBe(status);
      expect(subscription?.cancelAt).toEqual(cancelAt);
    },
  );
});
