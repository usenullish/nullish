import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  getSelfSubscriptionTrialEnd,
  trialReminderDelay,
} from "../../../src/core/_helpers/subscriptions";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("core/_helpers/subscriptions", () => {
  const planIds: string[] = [];

  let organizationId: string;
  let periodEnd: Date;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(plans).where(inArray(plans.id, planIds));
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    periodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.TRIALING, periodEnd })
      .where(eq(subscriptions.organizationId, organizationId));
  });

  describe("getSelfSubscriptionTrialEnd", () => {
    test("returns the end of the trial of a self subscription", async () => {
      const trialEnd = await db.transaction((tx) =>
        getSelfSubscriptionTrialEnd({ tx, organizationId }),
      );

      expect(trialEnd).toEqual(periodEnd);
    });

    test("returns nothing for a subscription that is not trialing", async () => {
      await db
        .update(subscriptions)
        .set({ status: SubscriptionStatus.ACTIVE, periodEnd: null })
        .where(eq(subscriptions.organizationId, organizationId));

      const trialEnd = await db.transaction((tx) =>
        getSelfSubscriptionTrialEnd({ tx, organizationId }),
      );

      expect(trialEnd).toBeUndefined();
    });

    test("returns nothing for a subscription trialing on a plan that is not self", async () => {
      const [plan] = await db
        .insert(plans)
        .values({ provider: SubscriptionProvider.STRIPE })
        .returning();
      assertNonNullish(plan);
      planIds.push(plan.id);

      await db
        .update(subscriptions)
        .set({ planId: plan.id })
        .where(eq(subscriptions.organizationId, organizationId));

      const trialEnd = await db.transaction((tx) =>
        getSelfSubscriptionTrialEnd({ tx, organizationId }),
      );

      expect(trialEnd).toBeUndefined();
    });
  });

  describe("trialReminderDelay", () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date("2026-11-01T10:00:00Z");

    const delayFor = ({ trialDays }: { trialDays: number }) =>
      trialReminderDelay({ trialEnd: new Date(now.getTime() + trialDays * DAY_MS), now });

    test("reminds three days before the end of a long trial", () => {
      expect(delayFor({ trialDays: 14 })).toBe(11 * DAY_MS);
    });

    test("reminds three days before the end of a six days trial", () => {
      expect(delayFor({ trialDays: 6 })).toBe(3 * DAY_MS);
    });

    test("reminds halfway through a trial shorter than six days", () => {
      expect(delayFor({ trialDays: 2 })).toBe(DAY_MS);
    });
  });
});
