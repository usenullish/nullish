import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  getAndLockExistingSubscription,
  updateSubscription,
} from "../../../src/services/_helpers/subscriptions";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_MISSING_ORG_ID,
  TEST_USER_ID,
} from "../../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const instance = await openTestDb();
const db = instance.connection;

const DAY_MS = 24 * 60 * 60 * 1000;

describe("subscriptions helpers", () => {
  const claimIds: string[] = [];

  let organizationId: string;

  const insertClaim = async (values: typeof claims.$inferInsert = {}): Promise<string> => {
    const [claim] = await db.insert(claims).values(values).returning();
    assertNonNullish(claim);
    claimIds.push(claim.id);

    return claim.id;
  };

  const subscriptionOf = async () => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);

    return subscription;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(inArray(claims.id, claimIds));
    await instance.close();
  });

  describe("getAndLockExistingSubscription", () => {
    test("returns the subscription of the organization", async () => {
      const { id } = await subscriptionOf();

      const subscription = await db.transaction((tx) =>
        getAndLockExistingSubscription({ tx, organizationId }),
      );

      expect(subscription.id).toBe(id);
      expect(subscription.organizationId).toBe(organizationId);
    });

    test("locks the subscription until the end of the transaction", async () => {
      const { id } = await subscriptionOf();

      const error = await db.transaction(async (tx) => {
        await getAndLockExistingSubscription({ tx, organizationId });

        return await db
          .execute(
            sql`SELECT id FROM subscription.subscriptions WHERE id = ${id} FOR UPDATE NOWAIT`,
          )
          .catch((e: unknown) => e);
      });

      expect(error).toBeInstanceOf(Error);
    });

    test("throws for an organization without subscription", async () => {
      await expect(
        db.transaction((tx) =>
          getAndLockExistingSubscription({ tx, organizationId: TEST_MISSING_ORG_ID }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("updateSubscription", () => {
    test("updates the status, the end and the claim", async () => {
      const subscription = await subscriptionOf();
      const claimId = await insertClaim();
      const periodEnd = new Date(Date.now() + DAY_MS);

      const updated = await db.transaction((tx) =>
        updateSubscription({
          tx,
          subscription,
          claimId,
          status: SubscriptionStatus.PAST_DUE,
          periodEnd,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(updated.periodEnd).toEqual(periodEnd);
      expect(updated.claimId).toBe(claimId);
    });

    test("keeps the end when none is given", async () => {
      const periodEnd = new Date(Date.now() + DAY_MS);

      await db
        .update(subscriptions)
        .set({ periodEnd })
        .where(eq(subscriptions.organizationId, organizationId));

      const subscription = await subscriptionOf();

      const updated = await db.transaction((tx) =>
        updateSubscription({
          tx,
          subscription,
          claimId: subscription.claimId,
          status: SubscriptionStatus.INACTIVE,
          periodEnd: undefined,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.INACTIVE);
      expect(updated.periodEnd).toEqual(periodEnd);
    });

    test("accepts an unchanged claim that has expired", async () => {
      const claimId = await insertClaim();

      await db
        .update(subscriptions)
        .set({ claimId })
        .where(eq(subscriptions.organizationId, organizationId));
      await db
        .update(claims)
        .set({ expiresAt: new Date(Date.now() - DAY_MS) })
        .where(eq(claims.id, claimId));

      const subscription = await subscriptionOf();

      const updated = await db.transaction((tx) =>
        updateSubscription({
          tx,
          subscription,
          claimId,
          status: SubscriptionStatus.INACTIVE,
          periodEnd: undefined,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.INACTIVE);
      expect(updated.claimId).toBe(claimId);
    });

    test("rejects moving to an expired claim", async () => {
      const subscription = await subscriptionOf();
      const claimId = await insertClaim({ expiresAt: new Date(Date.now() - DAY_MS) });

      await expect(
        db.transaction((tx) =>
          updateSubscription({
            tx,
            subscription,
            claimId,
            status: SubscriptionStatus.ACTIVE,
            periodEnd: undefined,
          }),
        ),
      ).rejects.toThrow();

      expect((await subscriptionOf()).claimId).toBe(subscription.claimId);
    });

    test("throws for a subscription that does not exist", async () => {
      const subscription = await subscriptionOf();

      await expect(
        db.transaction((tx) =>
          updateSubscription({
            tx,
            subscription: { ...subscription, id: TEST_MISSING_ID },
            claimId: subscription.claimId,
            status: SubscriptionStatus.INACTIVE,
            periodEnd: undefined,
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
