import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { eq, inArray, sql } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  MembershipRole,
  SubscriptionProvider,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import {
  createOrganization,
  resetDb,
  seedUser,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../_test-utils";
import { getTrialingSubscription } from "../../../../../src/jobs/workers/mails/_helpers/subscription-trial-reminder";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

describe("subscription trial reminder helpers", () => {
  const planIds: string[] = [];

  let organizationId: string;
  let periodEnd: Date;

  const getTrial = ({ userId = TEST_USER_ID }: { userId?: string } = {}) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);

      return await getTrialingSubscription({ tx, organizationId, userId });
    });

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });
  });

  afterAll(async () => {
    await resetDb({ db });
    await db.delete(plans).where(inArray(plans.id, planIds));
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization({ db, withAddress: false });
    periodEnd = new Date(Date.now() + 3 * DAY_MS);

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.TRIALING, periodEnd })
      .where(eq(subscriptions.organizationId, organizationId));
  });

  describe("getTrialingSubscription", () => {
    test("returns the subscription, organization and member while the organization is trialing", async () => {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      assertNonNullish(organization);

      expect(await getTrial()).toEqual({
        subscription: { periodEnd },
        organization: { name: organization.name },
        member: { email: `${TEST_USER_ID}@test.dev` },
      });
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

      expect(await getTrial()).toBeUndefined();
    });

    test("returns nothing once the subscription is active", async () => {
      await db
        .update(subscriptions)
        .set({ status: SubscriptionStatus.ACTIVE, periodEnd: null })
        .where(eq(subscriptions.organizationId, organizationId));

      expect(await getTrial()).toBeUndefined();
    });

    test("returns nothing for an organization marked as deleted", async () => {
      await db
        .update(organizations)
        .set({ deletedAt: new Date(Date.now() - DAY_MS) })
        .where(eq(organizations.id, organizationId));

      expect(await getTrial()).toBeUndefined();
    });

    test("returns nothing for a member who is not an admin", async () => {
      await db.insert(memberships).values({
        organizationId,
        userId: TEST_OTHER_USER_ID,
        role: MembershipRole.ACCOUNTANT,
      });

      expect(await getTrial({ userId: TEST_OTHER_USER_ID })).toBeUndefined();
    });

    test("returns nothing for a user who is not a member", async () => {
      expect(await getTrial({ userId: TEST_OTHER_USER_ID })).toBeUndefined();
    });
  });
});
