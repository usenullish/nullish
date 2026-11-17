import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const runSeed = async (): Promise<void> => {
  const seed = await Bun.file(
    new URL(
      "../../../migrations/20261117093259_seed_organization_subscriptions/migration.sql",
      import.meta.url,
    ),
  ).text();

  await db.execute(sql.raw(seed));
};

const subscriptionsOf = (organizationId: string) =>
  db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));

describe("seed_organization_subscriptions", () => {
  let initialClaimId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialClaimId = settings.initialClaimId;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("gives an organization without subscription an active one on the initial claim without end", async () => {
    const organizationId = await createOrganization(db);
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, organizationId));

    await runSeed();

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.claimId).toBe(initialClaimId);
    expect(rows[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(rows[0]?.periodEnd).toBeNull();
  });

  test("keeps the subscription an organization already has", async () => {
    const organizationId = await createOrganization(db);
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));

    await runSeed();

    const rows = await subscriptionsOf(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe(SubscriptionStatus.INACTIVE);
  });
});
