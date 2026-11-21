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

const CONSTRAINT = "subscriptions_cancel_at_period_end_period_end";

describe("subscriptions_cancel_at_period_end_period_end", () => {
  let organizationId: string;

  const setSubscription = ({
    periodEnd,
    cancelAtPeriodEnd,
  }: {
    periodEnd: Nullable<Date>;
    cancelAtPeriodEnd: boolean;
  }) =>
    db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.ACTIVE, periodEnd, cancelAtPeriodEnd })
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

  test("renews a new subscription by default", async () => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    expect(subscription?.cancelAtPeriodEnd).toBe(false);
  });

  test("rejects a cancellation at the end of the period without end", async () => {
    const error = await setSubscription({ periodEnd: null, cancelAtPeriodEnd: true }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("rejects removing the end of a subscription cancelled at the end of the period", async () => {
    await setSubscription({ periodEnd: new Date(), cancelAtPeriodEnd: true });

    const error = await setSubscription({ periodEnd: null, cancelAtPeriodEnd: true }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("allows a cancellation at the end of the period with an end", async () => {
    const [subscription] = await setSubscription({
      periodEnd: new Date(),
      cancelAtPeriodEnd: true,
    });

    expect(subscription?.cancelAtPeriodEnd).toBe(true);
  });

  test("allows a subscription without end that renews", async () => {
    const [subscription] = await setSubscription({ periodEnd: null, cancelAtPeriodEnd: false });

    expect(subscription?.cancelAtPeriodEnd).toBe(false);
  });
});
