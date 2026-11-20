import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const asUser = <T>({
  userId,
  fn,
}: {
  userId: string;
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>;
}): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return await fn(tx);
  });

describe("subscription schema permissions", () => {
  let organizationId: string;
  let planId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);
    subscriptionId = subscription.id;
    planId = subscription.planId;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("lets a user read the plans", async () => {
    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.select().from(plans).where(eq(plans.id, planId)),
    });

    expect(rows).toHaveLength(1);
  });

  test("rejects a user writing a plan", async () => {
    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.insert(plans).values({ provider: SubscriptionProvider.SELF }),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("lets a member read the subscription of their organization", async () => {
    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)),
    });

    expect(rows).toHaveLength(1);
  });

  test("hides the subscription from a user who is not a member", async () => {
    const rows = await asUser({
      userId: TEST_OTHER_USER_ID,
      fn: (tx) => tx.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)),
    });

    expect(rows).toHaveLength(0);
  });

  test("rejects a member inserting a subscription", async () => {
    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx
          .insert(subscriptions)
          .values({ organizationId, planId, status: SubscriptionStatus.ACTIVE }),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("rejects a member updating a subscription", async () => {
    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx
          .update(subscriptions)
          .set({ status: SubscriptionStatus.INACTIVE })
          .where(eq(subscriptions.id, subscriptionId)),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("rejects a member deleting a subscription", async () => {
    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.delete(subscriptions).where(eq(subscriptions.id, subscriptionId)),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });
});
