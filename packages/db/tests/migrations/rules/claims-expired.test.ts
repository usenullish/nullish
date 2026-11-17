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

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

const insertClaim = async (expiresAt: Date): Promise<string> => {
  const [claim] = await db.insert(claims).values({ expiresAt }).returning();
  assertNonNullish(claim);
  return claim.id;
};

describe("check_claim_not_expired", () => {
  let organizationId: string;
  let expiredClaimId: string;
  let openClaimId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);
    expiredClaimId = await insertClaim(new Date(Date.now() - DAY_MS));
    openClaimId = await insertClaim(new Date(Date.now() + DAY_MS));
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, expiredClaimId));
    await db.delete(claims).where(eq(claims.id, openClaimId));
    await client.close();
  });

  test("rejects putting a subscription on an expired claim", async () => {
    const error = await db
      .update(subscriptions)
      .set({ claimId: expiredClaimId })
      .where(eq(subscriptions.organizationId, organizationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has expired");
  });

  test("allows putting a subscription on a claim that has not expired yet", async () => {
    const [subscription] = await db
      .update(subscriptions)
      .set({ claimId: openClaimId })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    expect(subscription?.claimId).toBe(openClaimId);
  });

  test("rejects making an expired claim the initial claim", async () => {
    const error = await db
      .update(subscriptionSettings)
      .set({ initialClaimId: expiredClaimId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has expired");
  });
});
