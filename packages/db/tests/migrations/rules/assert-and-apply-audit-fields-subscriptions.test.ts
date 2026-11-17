import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Core.Subscriptions.SubscriptionsSchema;

describe("core.assert_and_apply_audit_fields on core.subscriptions", () => {
  let subscriptionId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    const organizationId = await createOrganization(db);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);
    subscriptionId = subscription.id;
  });

  test("increments version and bumps updated_at on an update", async () => {
    const [before] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    const [after] = await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.CANCELED })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    expect(after?.version).toBe((before?.version ?? 0) + 1);
    expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before?.updatedAt.getTime() ?? 0);
  });

  test("rejects an update that sends back a stale version", async () => {
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.PAST_DUE })
      .where(eq(subscriptions.id, subscriptionId));

    const error = await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.CANCELED, version: 1 })
      .where(eq(subscriptions.id, subscriptionId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("was modified concurrently");
  });
});
