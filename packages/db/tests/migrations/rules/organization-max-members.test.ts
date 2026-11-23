import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MembershipRole, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invitations = DbSchema.Core.Invitations.InvitationsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const hashOf = (token: string): string => new CryptoHasher("sha256").update(token).digest("hex");

describe("check_organization_max_members", () => {
  const planIds: string[] = [];
  const planRulesIds: string[] = [];

  let organizationId: string;

  const usePlan = async ({ maxMembers }: { maxMembers?: number }) => {
    const [rules] =
      maxMembers === undefined
        ? [undefined]
        : await db.insert(planRules).values({ maxMembers }).returning();

    if (rules !== undefined) {
      planRulesIds.push(rules.id);
    }

    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, planRulesId: rules?.id ?? null })
      .returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    await db
      .update(subscriptions)
      .set({ planId: plan.id })
      .where(eq(subscriptions.organizationId, organizationId));
  };

  const insertInvitation = ({
    email = `${crypto.randomUUID()}@test.dev`,
    expiresAt,
  }: {
    email?: string;
    expiresAt?: Date;
  } = {}) =>
    db
      .insert(invitations)
      .values({
        organizationId,
        email,
        role: MembershipRole.ACCOUNTANT,
        tokenHash: hashOf(crypto.randomUUID()),
        expiresAt,
      })
      .returning();

  const insertMember = () =>
    db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT })
      .returning();

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(plans).where(inArray(plans.id, planIds));
    await db.delete(planRules).where(inArray(planRules.id, planRulesIds));
    await client.close();
  });

  describe("inviting", () => {
    test("allows an invitation once the members reach the limit", async () => {
      await usePlan({ maxMembers: 1 });

      const rows = await insertInvitation();

      expect(rows).toHaveLength(1);
    });
  });

  describe("joining", () => {
    test("allows a member below the limit", async () => {
      await usePlan({ maxMembers: 2 });

      const rows = await insertMember();

      expect(rows).toHaveLength(1);
    });

    test("rejects a member once the members reach the limit", async () => {
      await usePlan({ maxMembers: 1 });

      const error = await insertMember().catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("has reached its limit of 1 members");
    });

    test("does not count the pending invitations", async () => {
      await usePlan({ maxMembers: 2 });
      await insertInvitation();

      const rows = await insertMember();

      expect(rows).toHaveLength(1);
    });

    test("allows any member with a plan without rules", async () => {
      await usePlan({});

      const rows = await insertMember();

      expect(rows).toHaveLength(1);
    });
  });
});
