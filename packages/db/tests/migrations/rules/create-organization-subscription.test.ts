import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
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

const subscriptions = DbSchema.Core.Subscriptions.SubscriptionsSchema;
const organizationRules = DbSchema.Instance.OrganizationRules.OrganizationRulesSchema;

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

const subscriptionsOf = (organizationId: string) =>
  db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));

describe("seed_subscription_for_organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db
      .update(organizationRules)
      .set({ initialSubscriptionStatus: SubscriptionStatus.ACTIVE });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("creates an active subscription without end", async () => {
    const organizationId = await createOrganization(db);

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(rows[0]?.periodEnd).toBeNull();
  });

  test("creates a pending subscription when the organization rules start it as pending", async () => {
    await db
      .update(organizationRules)
      .set({ initialSubscriptionStatus: SubscriptionStatus.PENDING });

    const organizationId = await createOrganization(db);

    const rows = await subscriptionsOf(organizationId);

    expect(rows[0]?.status).toBe(SubscriptionStatus.PENDING);
  });

  test("rejects a second subscription for the organization", async () => {
    const organizationId = await createOrganization(db);

    const error = await db
      .insert(subscriptions)
      .values({ organizationId, status: SubscriptionStatus.ACTIVE })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscriptions_org_uidx");
  });

  test("lets a member read the subscription of their organization", async () => {
    const organizationId = await createOrganization(db);

    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)),
    });

    expect(rows).toHaveLength(1);
  });

  test("hides the subscription from a user who is not a member", async () => {
    const organizationId = await createOrganization(db);

    const rows = await asUser({
      userId: TEST_OTHER_USER_ID,
      fn: (tx) =>
        tx.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)),
    });

    expect(rows).toHaveLength(0);
  });

  test("rejects a member inserting a subscription", async () => {
    const organizationId = await createOrganization(db);
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, organizationId));

    const error = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx.insert(subscriptions).values({ organizationId, status: SubscriptionStatus.ACTIVE }),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("row-level security");
  });

  test("ignores a member updating the subscription", async () => {
    const organizationId = await createOrganization(db);
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.PENDING })
      .where(eq(subscriptions.organizationId, organizationId));

    const updated = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx
          .update(subscriptions)
          .set({ status: SubscriptionStatus.ACTIVE })
          .where(eq(subscriptions.organizationId, organizationId))
          .returning(),
    });

    const rows = await subscriptionsOf(organizationId);

    expect(updated).toHaveLength(0);
    expect(rows[0]?.status).toBe(SubscriptionStatus.PENDING);
  });

  test("ignores a member deleting the subscription", async () => {
    const organizationId = await createOrganization(db);

    const deleted = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx
          .delete(subscriptions)
          .where(eq(subscriptions.organizationId, organizationId))
          .returning(),
    });

    const rows = await subscriptionsOf(organizationId);

    expect(deleted).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });
});
