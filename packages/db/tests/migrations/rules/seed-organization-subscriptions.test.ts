import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Core.Subscriptions.SubscriptionsSchema;

const runSeed = async (): Promise<void> => {
  const seed = await Bun.file(
    new URL(
      "../../../migrations/20261116161300_seed_organization_subscriptions/migration.sql",
      import.meta.url,
    ),
  ).text();

  await db.execute(sql.raw(seed));
};

const subscriptionsOf = (organizationId: string) =>
  db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));

describe("seed_organization_subscriptions", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("gives an organization without subscription an active subscription without end", async () => {
    const organizationId = await createOrganization(db);
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, organizationId));

    await runSeed();

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(rows[0]?.periodEnd).toBeNull();
  });

  test("keeps the subscription an organization already has", async () => {
    const organizationId = await createOrganization(db);
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.CANCELED })
      .where(eq(subscriptions.organizationId, organizationId));

    await runSeed();

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe(SubscriptionStatus.CANCELED);
  });
});
