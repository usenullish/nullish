import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
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

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
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
  let claimId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);

    const [claim] = await db.insert(claims).values({}).returning();
    assertNonNullish(claim);
    claimId = claim.id;

    const [subscription] = await db
      .insert(subscriptions)
      .values({ organizationId, claimId, status: SubscriptionStatus.ACTIVE })
      .returning();
    assertNonNullish(subscription);
    subscriptionId = subscription.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, claimId));
    await client.close();
  });

  test("lets a user read the claims", async () => {
    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.select().from(claims).where(eq(claims.id, claimId)),
    });

    expect(rows).toHaveLength(1);
  });

  test("rejects a user writing a claim", async () => {
    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.insert(claims).values({}),
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
          .values({ organizationId, claimId, status: SubscriptionStatus.ACTIVE }),
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
