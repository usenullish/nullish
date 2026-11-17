import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("check_organization_immutable on subscription.subscriptions", () => {
  let claimId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const [claim] = await db.insert(claims).values({}).returning();
    assertNonNullish(claim);
    claimId = claim.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, claimId));
    await client.close();
  });

  test("rejects moving a subscription to another organization", async () => {
    const organizationId = await createOrganization(db);
    const otherOrganizationId = await createOrganization(db);

    const [subscription] = await db
      .insert(subscriptions)
      .values({ organizationId, claimId, status: SubscriptionStatus.ACTIVE })
      .returning();
    assertNonNullish(subscription);

    const error = await db
      .update(subscriptions)
      .set({ organizationId: otherOrganizationId })
      .where(eq(subscriptions.id, subscription.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });
});
