import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DeleteOrganizationMemberService } from "../../../../src/core/services/organization-members/organization-member.delete";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const conversations = DbSchema.Chat.Conversations.ConversationsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const deleteMembership = (membershipId: string) =>
  DeleteOrganizationMemberService.create({ db, userId: TEST_USER_ID, membershipId }).delete();

const insertMembership = async ({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: "admin" | "accountant" | "reviewer";
}): Promise<string> => {
  const [row] = await db.insert(memberships).values({ organizationId, userId, role }).returning();
  assertNonNullish(row);
  return row.id;
};

const adminMembershipId = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "admin")));
  assertNonNullish(row);
  return row.id;
};

const membershipExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(memberships).where(eq(memberships.id, id));
  return rows.length === 1;
};

describe("DeleteOrganizationMemberService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("removes a member of an organization of the admin and returns its id", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const memberId = await insertMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "accountant",
    });

    const result = await deleteMembership(memberId);

    expect(result).toEqual({ status: "success", result: { id: memberId } });
    expect(await membershipExists(memberId)).toBeFalse();
  });

  test("removes another admin of the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const otherAdminId = await insertMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "admin",
    });

    const result = await deleteMembership(otherAdminId);

    expect(result).toEqual({ status: "success", result: { id: otherAdminId } });
    expect(await membershipExists(otherAdminId)).toBeFalse();
  });

  test("lets a member leave an organization", async () => {
    const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);
    const ownId = await insertMembership({
      organizationId,
      userId: TEST_USER_ID,
      role: "reviewer",
    });

    const result = await deleteMembership(ownId);

    expect(result).toEqual({ status: "success", result: { id: ownId } });
    expect(await membershipExists(ownId)).toBeFalse();
  });

  test("lets an admin leave an organization that has another admin", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const ownId = await adminMembershipId(organizationId);
    await insertMembership({ organizationId, userId: TEST_OTHER_USER_ID, role: "admin" });

    const result = await deleteMembership(ownId);

    expect(result).toEqual({ status: "success", result: { id: ownId } });
    expect(await membershipExists(ownId)).toBeFalse();
  });

  test("removes the conversations of the person in the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const memberId = await insertMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "accountant",
    });
    const [conversation] = await db
      .insert(conversations)
      .values({ userId: TEST_OTHER_USER_ID, organizationId })
      .returning();
    assertNonNullish(conversation);

    await deleteMembership(memberId);

    const rows = await db.select().from(conversations).where(eq(conversations.id, conversation.id));

    expect(rows).toEqual([]);
  });

  test.each(["accountant", "reviewer"] as const)(
    "resolves to undefined when a member with the %s role removes someone else",
    async (role) => {
      const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);
      await insertMembership({ organizationId, userId: TEST_USER_ID, role });
      const otherAdminId = await adminMembershipId(organizationId);

      const result = await deleteMembership(otherAdminId);

      expect(result).toEqual({ status: "success", result: undefined });
      expect(await membershipExists(otherAdminId)).toBeTrue();
    },
  );

  test("resolves to undefined for a membership of an organization the user is not a member of", async () => {
    const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);
    const otherAdminId = await adminMembershipId(organizationId);

    const result = await deleteMembership(otherAdminId);

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await membershipExists(otherAdminId)).toBeTrue();
  });

  test("resolves to undefined when nothing matches", async () => {
    const result = await deleteMembership(TEST_MISSING_ID);

    expect(result).toEqual({ status: "success", result: undefined });
  });

  test("returns an error Result when the last admin leaves", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const ownId = await adminMembershipId(organizationId);

    const result = await deleteMembership(ownId);

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err instanceof Error && result.err.cause instanceof Error).toBeTrue();
    expect((result.err as Error & { cause: Error }).cause.message).toContain(
      "An organization needs at least one admin",
    );
    expect(await membershipExists(ownId)).toBeTrue();
  });
});
