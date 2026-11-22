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
  organizations,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const FOREIGN_KEY = "subscriptions_organization_id_organizations_id_fkey";

describe("subscriptions_organization_id_organizations_id_fkey", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("is checked at commit", async () => {
    const [constraint] = await db.execute<{ condeferrable: boolean; condeferred: boolean }>(
      sql`SELECT condeferrable, condeferred FROM pg_constraint WHERE conname = ${FOREIGN_KEY}`,
    );

    expect(constraint?.condeferrable).toBe(true);
    expect(constraint?.condeferred).toBe(true);
  });

  test("rejects at commit a subscription of an organization that does not exist", async () => {
    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);

    const error = await db
      .transaction(async (tx) => {
        await tx.insert(subscriptions).values({
          organizationId: crypto.randomUUID(),
          planId: settings.initialPlanId,
          status: SubscriptionStatus.ACTIVE,
        });
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(FOREIGN_KEY);
  });

  test("deletes the subscription with its organization", async () => {
    const organizationId = await createOrganization(db);

    await db
      .update(organizations)
      .set({ deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) })
      .where(eq(organizations.id, organizationId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));

    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    expect(rows).toHaveLength(0);
  });
});
