import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import {
  DbSchema,
  OrganizationSubscriptionStatus,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionSubscriptionSummaries } from "../../../src/subscription/composites/subscription-summaries";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const listSummaries = (organizationId: string) =>
  DbCollectionSubscriptionSummaries.create({
    db,
    userId: TEST_USER_ID,
    foreignKeyId: organizationId,
  }).list({
    pagination: { limit: 100, offset: 0 },
    sort: { field: "createdAt", direction: "asc" },
  });

const organizationStatusOf = async (organizationId: string) => {
  const result = await listSummaries(organizationId);

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.data[0]?.organization.status;
};

const updateSubscription = ({
  organizationId,
  values,
}: {
  organizationId: string;
  values: Partial<typeof subscriptions.$inferInsert>;
}) => db.update(subscriptions).set(values).where(eq(subscriptions.organizationId, organizationId));

describe("DbCollectionSubscriptionSummaries", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns the subscription of the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await listSummaries(organizationId);

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.data).toHaveLength(1);
    expect(result.result.data[0]?.subscription.organizationId).toBe(organizationId);
  });

  test("is open with an active subscription", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.OPEN);
  });

  test("is locked with an active subscription after its end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { periodEnd: new Date(Date.now() - DAY_MS) },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.LOCKED);
  });

  test("is open with a trialing subscription before its end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.TRIALING, periodEnd: new Date(Date.now() + DAY_MS) },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.OPEN);
  });

  test("is locked with a trialing subscription after its end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.TRIALING, periodEnd: new Date(Date.now() - DAY_MS) },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.LOCKED);
  });

  test("is in grace with a past due subscription within the grace days", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.PAST_DUE, periodEnd: new Date(Date.now() - DAY_MS) },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.GRACE);
  });

  test("is in grace with a past due subscription before its end", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.PAST_DUE, periodEnd: new Date(Date.now() + DAY_MS) },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.GRACE);
  });

  test("is locked with a past due subscription after the grace days", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: {
        status: SubscriptionStatus.PAST_DUE,
        periodEnd: new Date(Date.now() - 8 * DAY_MS),
      },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.LOCKED);
  });

  test("is locked with an inactive subscription", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await updateSubscription({
      organizationId,
      values: { status: SubscriptionStatus.INACTIVE },
    });

    expect(await organizationStatusOf(organizationId)).toBe(OrganizationSubscriptionStatus.LOCKED);
  });

  describe("expiresAt", () => {
    const organizationOf = async (organizationId: string) => {
      const result = await listSummaries(organizationId);

      if (result.status === "error") {
        throw result.err;
      }

      return result.result.data[0]?.organization;
    };

    test("is empty for an open organization without end", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      expect(await organizationOf(organizationId)).toEqual({
        status: OrganizationSubscriptionStatus.OPEN,
        expiresAt: null,
      });
    });

    test("is the end of the subscription for an open organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const periodEnd = new Date(Date.now() + DAY_MS);

      await updateSubscription({ organizationId, values: { periodEnd } });

      expect(await organizationOf(organizationId)).toEqual({
        status: OrganizationSubscriptionStatus.OPEN,
        expiresAt: periodEnd,
      });
    });

    test("is the end of the subscription plus the grace days in grace", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const periodEnd = new Date(Date.now() - DAY_MS);

      await updateSubscription({
        organizationId,
        values: { status: SubscriptionStatus.PAST_DUE, periodEnd },
      });

      const organization = await organizationOf(organizationId);

      if (organization?.status !== OrganizationSubscriptionStatus.GRACE) {
        expect(true).toBeFalse();
        return;
      }

      const expected = periodEnd.getTime() + 7 * DAY_MS;

      expect(Math.abs(organization.expiresAt.getTime() - expected)).toBeLessThanOrEqual(HOUR_MS);
    });

    test("is absent for a locked organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      await updateSubscription({
        organizationId,
        values: { status: SubscriptionStatus.INACTIVE },
      });

      expect(await organizationOf(organizationId)).toEqual({
        status: OrganizationSubscriptionStatus.LOCKED,
      });
    });
  });

  test("returns nothing for an organization the user is not a member of", async () => {
    const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);

    expect(await listSummaries(organizationId)).toEqual({
      status: "success",
      result: { data: [] },
    });
  });
});
