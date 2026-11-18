import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  organizations,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

describe("check_organizations_locked", () => {
  let organizationId: string;

  const lock = () =>
    db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));

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

  test("allows renaming an organization with a valid subscription", async () => {
    const [renamed] = await asUser((tx) =>
      tx
        .update(organizations)
        .set({ name: "Renamed" })
        .where(eq(organizations.id, organizationId))
        .returning(),
    );

    expect(renamed?.name).toBe("Renamed");
  });

  test("rejects renaming a locked organization", async () => {
    await lock();

    const error = await asUser((tx) =>
      tx.update(organizations).set({ name: "Renamed" }).where(eq(organizations.id, organizationId)),
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("can only be deleted");
  });

  test("rejects renaming a locked organization while deleting it", async () => {
    await lock();

    const error = await asUser((tx) =>
      tx
        .update(organizations)
        .set({ name: "Renamed", deletedAt: new Date() })
        .where(eq(organizations.id, organizationId)),
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("can only be deleted");
  });

  test("allows deleting a locked organization", async () => {
    await lock();

    const [deleted] = await asUser((tx) =>
      tx
        .update(organizations)
        .set({ deletedAt: new Date() })
        .where(eq(organizations.id, organizationId))
        .returning(),
    );

    expect(deleted?.deletedAt).not.toBeNull();
  });
});
