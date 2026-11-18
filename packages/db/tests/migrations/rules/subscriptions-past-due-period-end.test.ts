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

const CONSTRAINT = "subscriptions_past_due_period_end";

describe("subscriptions_past_due_period_end", () => {
  let organizationId: string;

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

  test("rejects a past due subscription without end", async () => {
    const error = await setSubscription({
      status: SubscriptionStatus.PAST_DUE,
      periodEnd: null,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("rejects removing the end of a past due subscription", async () => {
    await setSubscription({ status: SubscriptionStatus.PAST_DUE, periodEnd: new Date() });

    const error = await setSubscription({
      status: SubscriptionStatus.PAST_DUE,
      periodEnd: null,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("allows a past due subscription with an end", async () => {
    const periodEnd = new Date();

    const [subscription] = await setSubscription({
      status: SubscriptionStatus.PAST_DUE,
      periodEnd,
    });

    expect(subscription?.status).toBe(SubscriptionStatus.PAST_DUE);
    expect(subscription?.periodEnd).toEqual(periodEnd);
  });

  test.each([SubscriptionStatus.ACTIVE, SubscriptionStatus.INACTIVE])(
    "allows a %s subscription without end",
    async (status) => {
      const [subscription] = await setSubscription({ status, periodEnd: null });

      expect(subscription?.status).toBe(status);
      expect(subscription?.periodEnd).toBeNull();
    },
  );
});
