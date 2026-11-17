import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("check_organization_immutable on subscription.subscriptions", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects moving a subscription to another organization", async () => {
    const organizationId = await createOrganization(db);
    const otherOrganizationId = await createOrganization(db);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);

    const error = await db
      .update(subscriptions)
      .set({ organizationId: otherOrganizationId })
      .where(eq(subscriptions.id, subscription.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });
});
