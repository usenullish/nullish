import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  getExistingSubscription,
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

const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const instance = await openTestDb();
const db = instance.connection;

const DAY_MS = 24 * 60 * 60 * 1000;

describe("subscriptions helpers", () => {
  const planIds: string[] = [];

  let organizationId: string;

  const insertPlan = async (
    values: Omit<typeof plans.$inferInsert, "provider"> = {},
  ): Promise<string> => {
    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, ...values })
      .returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    return plan.id;
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
    await db.delete(plans).where(inArray(plans.id, planIds));
    await instance.close();
  });

  describe("getExistingSubscription", () => {
    const lockError = ({ id }: { id: string }) =>
      db
        .execute(sql`SELECT id FROM subscription.subscriptions WHERE id = ${id} FOR UPDATE NOWAIT`)
        .catch((e: unknown) => e);

    test("returns the subscription of the organization", async () => {
      const { id } = await subscriptionOf();

      const subscription = await db.transaction((tx) =>
        getExistingSubscription({ tx, organizationId }),
      );

      expect(subscription.id).toBe(id);
      expect(subscription.organizationId).toBe(organizationId);
    });

    test("locks the subscription until the end of the transaction when asked", async () => {
      const { id } = await subscriptionOf();

      const error = await db.transaction(async (tx) => {
        await getExistingSubscription({ tx, organizationId, lock: "update" });

        return await lockError({ id });
      });

      expect(error).toBeInstanceOf(Error);
    });

    test("does not lock the subscription without a lock", async () => {
      const { id } = await subscriptionOf();

      const error = await db.transaction(async (tx) => {
        await getExistingSubscription({ tx, organizationId });

        return await lockError({ id });
      });

      expect(error).not.toBeInstanceOf(Error);
    });

    test("throws for an organization without subscription", async () => {
      await expect(
        db.transaction((tx) =>
          getExistingSubscription({ tx, organizationId: TEST_MISSING_ORG_ID }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("updateSubscription", () => {
    test("updates the status, the end and the plan", async () => {
      const subscription = await subscriptionOf();
      const planId = await insertPlan();
      const periodEnd = new Date(Date.now() + DAY_MS);

      const updated = await db.transaction((tx) =>
        updateSubscription({
          tx,
          subscription,
          planId,
          status: SubscriptionStatus.PAST_DUE,
          periodEnd,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(updated.periodEnd).toEqual(periodEnd);
      expect(updated.planId).toBe(planId);
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
          planId: subscription.planId,
          status: SubscriptionStatus.INACTIVE,
          periodEnd: undefined,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.INACTIVE);
      expect(updated.periodEnd).toEqual(periodEnd);
    });

    test("accepts an unchanged plan that has expired", async () => {
      const planId = await insertPlan();

      await db
        .update(subscriptions)
        .set({ planId })
        .where(eq(subscriptions.organizationId, organizationId));
      await db
        .update(plans)
        .set({ expiresAt: new Date(Date.now() - DAY_MS) })
        .where(eq(plans.id, planId));

      const subscription = await subscriptionOf();

      const updated = await db.transaction((tx) =>
        updateSubscription({
          tx,
          subscription,
          planId,
          status: SubscriptionStatus.INACTIVE,
          periodEnd: undefined,
        }),
      );

      expect(updated.status).toBe(SubscriptionStatus.INACTIVE);
      expect(updated.planId).toBe(planId);
    });

    test("rejects moving to an expired plan", async () => {
      const subscription = await subscriptionOf();
      const planId = await insertPlan({ expiresAt: new Date(Date.now() - DAY_MS) });

      await expect(
        db.transaction((tx) =>
          updateSubscription({
            tx,
            subscription,
            planId,
            status: SubscriptionStatus.ACTIVE,
            periodEnd: undefined,
          }),
        ),
      ).rejects.toThrow();

      expect((await subscriptionOf()).planId).toBe(subscription.planId);
    });

    test("throws for a subscription that does not exist", async () => {
      const subscription = await subscriptionOf();

      await expect(
        db.transaction((tx) =>
          updateSubscription({
            tx,
            subscription: { ...subscription, id: TEST_MISSING_ID },
            planId: subscription.planId,
            status: SubscriptionStatus.INACTIVE,
            periodEnd: undefined,
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
