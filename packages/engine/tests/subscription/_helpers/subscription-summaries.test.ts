import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { asc, eq, inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  OrganizationSubscriptionStatus,
  SubscriptionProvider,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { listSubscriptionSummaries } from "../../../src/subscription/_helpers/subscription-summaries";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const list = (organizationId: string) =>
  db.transaction((tx) =>
    listSubscriptionSummaries({
      tx,
      organizationId,
      orderBy: [asc(subscriptions.createdAt)],
      pagination: { limit: 100, offset: 0 },
    }),
  );

const updateSubscription = ({
  organizationId,
  values,
}: {
  organizationId: string;
  values: Partial<typeof subscriptions.$inferInsert>;
}) => db.update(subscriptions).set(values).where(eq(subscriptions.organizationId, organizationId));

describe("subscription/_helpers/subscription-summaries", () => {
  const stripePlanIds: string[] = [];
  const planRulesIds: string[] = [];

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ graceDays: 7 });
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(plans).where(inArray(plans.id, stripePlanIds));
    await db.delete(planRules).where(inArray(planRules.id, planRulesIds));
    await client.close();
  });

  test("returns only the subscription of the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await createOrganization(db, TEST_USER_ID);

    const summaries = await list(organizationId);

    expect(summaries.map(({ subscription }) => subscription.organizationId)).toEqual([
      organizationId,
    ]);
  });

  test("returns the self plan of the subscription without product", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [summary] = await list(organizationId);

    expect(summary?.plan).toEqual({ provider: SubscriptionProvider.SELF, rules: null });
    expect(summary?.product).toBeNull();
  });

  test("returns the product of a stripe plan", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.STRIPE })
      .returning();
    assertNonNullish(plan);
    stripePlanIds.push(plan.id);

    await db.insert(externalProducts).values({
      planId: plan.id,
      provider: SubscriptionProvider.STRIPE,
      externalProductId: `prod_${crypto.randomUUID()}`,
      name: "Cloud",
    });

    await updateSubscription({ organizationId, values: { planId: plan.id } });

    const [summary] = await list(organizationId);

    expect(summary?.plan).toEqual({ provider: SubscriptionProvider.STRIPE, rules: null });
    expect(summary?.product).toEqual({ name: "Cloud" });
  });

  test("returns no rules for a plan without rules", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [summary] = await list(organizationId);

    expect(summary?.plan.rules).toBeNull();
  });

  test("returns the rules of the plan", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [rules] = await db.insert(planRules).values({ maxMembers: 3 }).returning();
    assertNonNullish(rules);
    planRulesIds.push(rules.id);

    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.STRIPE, planRulesId: rules.id })
      .returning();
    assertNonNullish(plan);
    stripePlanIds.push(plan.id);

    await updateSubscription({ organizationId, values: { planId: plan.id } });

    const [summary] = await list(organizationId);

    expect(summary?.plan.rules).toEqual({ maxMembers: 3 });
  });

  test("returns an open organization without end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({
      status: OrganizationSubscriptionStatus.OPEN,
      expiresAt: null,
    });
  });

  test("returns an open organization until the end of its trial", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const periodEnd = new Date(Date.now() + DAY_MS);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.TRIALING, periodEnd },
    });

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({
      status: OrganizationSubscriptionStatus.OPEN,
      expiresAt: periodEnd,
    });
  });

  test("adds the grace days of the settings to the end in grace", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const periodEnd = new Date(Date.now() - DAY_MS);

    await db.update(subscriptionSettings).set({ graceDays: 10 });
    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.PAST_DUE, periodEnd },
    });

    const [summary] = await list(organizationId);

    if (summary?.organization.status !== OrganizationSubscriptionStatus.GRACE) {
      expect(true).toBeFalse();
      return;
    }

    const expected = periodEnd.getTime() + 10 * DAY_MS;

    expect(Math.abs(summary.organization.expiresAt.getTime() - expected)).toBeLessThanOrEqual(
      HOUR_MS,
    );
  });

  test("returns a locked organization without date", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.INACTIVE },
    });

    const [summary] = await list(organizationId);

    expect(summary?.organization).toEqual({ status: OrganizationSubscriptionStatus.LOCKED });
  });
});
