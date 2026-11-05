import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, DbView, LegalForm } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  memberships,
  organizations,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "./_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const users = DbSchema.Auth.Auth.users;
const organizationMembers = DbView.Core.OrganizationMembers.OrganizationMembersView;

const TEST_OUTSIDER_ID = "user-22222222-2222-4222-8222-222222222222";
const TEST_IMAGE = "https://example.com/avatar.png";

const createOrganizationOwnedBy = async (userId: string): Promise<string> => {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return tx
      .insert(organizations)
      .values({ name: `Org ${userId}`, legalForm: LegalForm.LLC })
      .returning();
  });

  const [organization] = rows;
  assertNonNullish(organization);
  return organization.id;
};

const listAs = ({ userId, organizationId }: { userId: string; organizationId: string }) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return tx
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(organizationMembers.createdAt);
  });

describe("core.organization_members", () => {
  let organizationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    await db.insert(users).values({
      id: TEST_OUTSIDER_ID,
      name: TEST_OUTSIDER_ID,
      email: `${TEST_OUTSIDER_ID}@test.dev`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.update(users).set({ image: TEST_IMAGE }).where(eq(users.id, TEST_OTHER_USER_ID));

    organizationId = await createOrganizationOwnedBy(TEST_USER_ID);
    otherOrganizationId = await createOrganizationOwnedBy(TEST_OUTSIDER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "reviewer" });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns every member of an organization to its admin", async () => {
    const rows = await listAs({ userId: TEST_USER_ID, organizationId });

    expect(rows.map(({ userId, role }) => ({ userId, role }))).toEqual([
      { userId: TEST_USER_ID, role: "admin" },
      { userId: TEST_OTHER_USER_ID, role: "reviewer" },
    ]);
  });

  test("returns the name, email and image of each member", async () => {
    const rows = await listAs({ userId: TEST_USER_ID, organizationId });

    const member = rows.find(({ userId }) => userId === TEST_OTHER_USER_ID);

    expect(member?.name).toBe(TEST_OTHER_USER_ID);
    expect(member?.email).toBe(`${TEST_OTHER_USER_ID}@test.dev`);
    expect(member?.image).toBe(TEST_IMAGE);
  });

  test("returns the membership fields of each member", async () => {
    const rows = await listAs({ userId: TEST_USER_ID, organizationId });

    const admin = rows.find(({ userId }) => userId === TEST_USER_ID);

    expect(admin?.organizationId).toBe(organizationId);
    expect(admin?.version).toBe(1);
    expect(admin?.createdAt).toBeInstanceOf(Date);
    expect(admin?.updatedAt).toBeInstanceOf(Date);
  });

  test("returns nothing to a member who is not an admin", async () => {
    const rows = await listAs({ userId: TEST_OTHER_USER_ID, organizationId });

    expect(rows).toEqual([]);
  });

  test("returns nothing to an admin of another organization", async () => {
    const rows = await listAs({ userId: TEST_OUTSIDER_ID, organizationId });

    expect(rows).toEqual([]);
  });

  test("returns nothing of another organization to an admin", async () => {
    const rows = await listAs({ userId: TEST_USER_ID, organizationId: otherOrganizationId });

    expect(rows).toEqual([]);
  });

  test("returns nothing without a current user", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      return tx.select().from(organizationMembers);
    });

    expect(rows).toEqual([]);
  });

  test("returns the members of every organization the user owns, and only those", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
      return tx.select().from(organizationMembers);
    });

    expect(new Set(rows.map(({ organizationId }) => organizationId))).toEqual(
      new Set([organizationId]),
    );
  });

  test("rejects writes", async () => {
    const error = await db
      .transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
        await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
        return tx.execute(
          sql`UPDATE core.organization_members SET role = 'reviewer' WHERE user_id = ${TEST_USER_ID}`,
        );
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot update view");
  });
});
