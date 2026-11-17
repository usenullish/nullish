import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  createOrganization,
  memberships,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const deleteOrganizationMemberAs = ({
  userId,
  membershipId,
}: {
  userId: string;
  membershipId: string;
}) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return await tx.execute<{ id: string }>(
      sql`SELECT * FROM core.delete_organization_member(${membershipId})`,
    );
  });

const membershipExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(memberships).where(eq(memberships.id, id));
  return rows.length === 1;
};

describe("delete_organization_member of a locked organization", () => {
  let memberMembershipId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    const organizationId = await createOrganization(db);

    const [member] = await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" })
      .returning();
    assertNonNullish(member);
    memberMembershipId = member.id;

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));
  });

  test("deletes nothing when an admin removes a member", async () => {
    const deleted = await deleteOrganizationMemberAs({
      userId: TEST_USER_ID,
      membershipId: memberMembershipId,
    });

    expect(deleted).toHaveLength(0);
    expect(await membershipExists(memberMembershipId)).toBe(true);
  });

  test("deletes nothing when a member leaves", async () => {
    const deleted = await deleteOrganizationMemberAs({
      userId: TEST_OTHER_USER_ID,
      membershipId: memberMembershipId,
    });

    expect(deleted).toHaveLength(0);
    expect(await membershipExists(memberMembershipId)).toBe(true);
  });
});
