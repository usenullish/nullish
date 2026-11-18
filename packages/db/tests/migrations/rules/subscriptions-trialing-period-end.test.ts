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

const CONSTRAINT = "subscriptions_trialing_period_end";

describe("subscriptions_trialing_period_end", () => {
  let organizationId: string;

  const setTrialing = ({ periodEnd }: { periodEnd: Nullable<Date> }) =>
    db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.TRIALING, periodEnd })
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

  test("rejects a trialing subscription without end", async () => {
    const error = await setTrialing({ periodEnd: null }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("rejects removing the end of a trialing subscription", async () => {
    await setTrialing({ periodEnd: new Date() });

    const error = await setTrialing({ periodEnd: null }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CONSTRAINT);
  });

  test("allows a trialing subscription with an end", async () => {
    const periodEnd = new Date();

    const [subscription] = await setTrialing({ periodEnd });

    expect(subscription?.status).toBe(SubscriptionStatus.TRIALING);
    expect(subscription?.periodEnd).toEqual(periodEnd);
  });
});
