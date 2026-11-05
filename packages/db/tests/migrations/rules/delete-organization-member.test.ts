import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MessageRole } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
  organizations,
  adminMembership,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl(), { bigint: true });
const db = drizzle({ client });

const users = DbSchema.Auth.Auth.users;
const conversations = DbSchema.Chat.Conversations.ConversationsSchema;
const messages = DbSchema.Chat.Messages.MessagesSchema;
const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

const TEST_THIRD_USER_ID = "user-22222222-2222-4222-8222-222222222222";

const addMembership = async ({
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

const deleteOrganizationMemberAs = ({
  userId,
  membershipId,
}: {
  userId: string;
  membershipId: string;
}): Promise<{ id: string }[]> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return await tx.execute<{ id: string }>(
      sql`SELECT * FROM core.delete_organization_member(${membershipId})`,
    );
  });

const addConversation = async ({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string | null;
}): Promise<string> => {
  const [row] = await db.insert(conversations).values({ userId, organizationId }).returning();
  assertNonNullish(row);
  return row.id;
};

const conversationExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(conversations).where(eq(conversations.id, id));
  return rows.length === 1;
};

const membershipExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(memberships).where(eq(memberships.id, id));
  return rows.length === 1;
};

describe("delete_organization_member", () => {
  let organizationId: string;
  let adminMembershipId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    await db.insert(users).values({
      id: TEST_THIRD_USER_ID,
      name: TEST_THIRD_USER_ID,
      email: `${TEST_THIRD_USER_ID}@test.dev`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    ({ id: adminMembershipId } = await adminMembership(db, organizationId));
  });

  describe("as an admin", () => {
    test("deletes the membership of another member and returns it", async () => {
      const memberId = await addMembership({
        organizationId,
        userId: TEST_OTHER_USER_ID,
        role: "accountant",
      });

      const rows = await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: memberId,
      });

      expect(rows.map(({ id }) => id)).toEqual([memberId]);
      expect(await membershipExists(memberId)).toBeFalse();
    });

    test("deletes the membership of another admin", async () => {
      const otherAdminId = await addMembership({
        organizationId,
        userId: TEST_OTHER_USER_ID,
        role: "admin",
      });

      const rows = await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: otherAdminId,
      });

      expect(rows).toHaveLength(1);
      expect(await membershipExists(otherAdminId)).toBeFalse();
    });

    test("leaves the organization when another admin remains", async () => {
      await addMembership({ organizationId, userId: TEST_OTHER_USER_ID, role: "admin" });

      const rows = await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: adminMembershipId,
      });

      expect(rows).toHaveLength(1);
      expect(await membershipExists(adminMembershipId)).toBeFalse();
    });

    test("rejects leaving the organization as its last admin", async () => {
      const error = await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: adminMembershipId,
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("An organization needs at least one admin");
      expect(await membershipExists(adminMembershipId)).toBeTrue();
    });

    test("returns no row for an unknown membership", async () => {
      const rows = await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: crypto.randomUUID(),
      });

      expect(rows).toEqual([]);
    });
  });

  describe.each(["accountant", "reviewer"] as const)("as a %s", (role) => {
    let ownId: string;

    beforeEach(async () => {
      ownId = await addMembership({ organizationId, userId: TEST_OTHER_USER_ID, role });
    });

    test("leaves the organization", async () => {
      const rows = await deleteOrganizationMemberAs({
        userId: TEST_OTHER_USER_ID,
        membershipId: ownId,
      });

      expect(rows.map(({ id }) => id)).toEqual([ownId]);
      expect(await membershipExists(ownId)).toBeFalse();
    });

    test("deletes nothing of the admin", async () => {
      const rows = await deleteOrganizationMemberAs({
        userId: TEST_OTHER_USER_ID,
        membershipId: adminMembershipId,
      });

      expect(rows).toEqual([]);
      expect(await membershipExists(adminMembershipId)).toBeTrue();
    });

    test("deletes nothing of another member", async () => {
      const otherId = await addMembership({
        organizationId,
        userId: TEST_THIRD_USER_ID,
        role: "reviewer",
      });

      const rows = await deleteOrganizationMemberAs({
        userId: TEST_OTHER_USER_ID,
        membershipId: otherId,
      });

      expect(rows).toEqual([]);
      expect(await membershipExists(otherId)).toBeTrue();
    });
  });

  test("deletes nothing for a user outside the organization", async () => {
    const memberId = await addMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "reviewer",
    });

    const rows = await deleteOrganizationMemberAs({
      userId: TEST_THIRD_USER_ID,
      membershipId: memberId,
    });

    expect(rows).toEqual([]);
    expect(await membershipExists(memberId)).toBeTrue();
  });

  test("deletes nothing without a current user", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      return await tx.execute<{ id: string }>(
        sql`SELECT * FROM core.delete_organization_member(${adminMembershipId})`,
      );
    });

    expect(rows).toEqual([]);
    expect(await membershipExists(adminMembershipId)).toBeTrue();
  });

  test("deletes nothing in a deleted organization", async () => {
    const memberId = await addMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "accountant",
    });
    await db
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    const rows = await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

    expect(rows).toEqual([]);
    expect(await membershipExists(memberId)).toBeTrue();
  });

  test("keeps the organization of the deleted membership", async () => {
    const memberId = await addMembership({
      organizationId,
      userId: TEST_OTHER_USER_ID,
      role: "accountant",
    });

    await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

    const rows = await db.select().from(organizations).where(eq(organizations.id, organizationId));

    expect(rows).toHaveLength(1);
  });
  describe("conversations of the removed person", () => {
    let memberId: string;
    let conversationId: string;

    beforeEach(async () => {
      memberId = await addMembership({
        organizationId,
        userId: TEST_OTHER_USER_ID,
        role: "accountant",
      });
      conversationId = await addConversation({ userId: TEST_OTHER_USER_ID, organizationId });
    });

    test("deletes their conversations in the organization", async () => {
      await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

      expect(await conversationExists(conversationId)).toBeFalse();
    });

    test("deletes their conversations in the organization when they leave", async () => {
      await deleteOrganizationMemberAs({ userId: TEST_OTHER_USER_ID, membershipId: memberId });

      expect(await conversationExists(conversationId)).toBeFalse();
    });

    test("deletes the messages of those conversations", async () => {
      await db
        .insert(messages)
        .values({ conversationId, position: 0, role: MessageRole.USER, content: "Hello" });

      await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      expect(rows).toEqual([]);
    });

    test("keeps the LLM usages of those conversations without the conversation", async () => {
      const [usage] = await db
        .insert(llmUsages)
        .values({
          userId: TEST_OTHER_USER_ID,
          organizationId,
          conversationId,
          model: "test-model",
          inputTokens: 1n,
          outputTokens: 1n,
        })
        .returning();
      assertNonNullish(usage);

      await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

      const [row] = await db.select().from(llmUsages).where(eq(llmUsages.id, usage.id));

      expect(row?.conversationId).toBeNull();
    });

    test("keeps their conversations in another organization and without organization", async () => {
      const otherOrganizationId = await createOrganization(db);
      await addMembership({
        organizationId: otherOrganizationId,
        userId: TEST_OTHER_USER_ID,
        role: "reviewer",
      });
      const elsewhereId = await addConversation({
        userId: TEST_OTHER_USER_ID,
        organizationId: otherOrganizationId,
      });
      const unscopedId = await addConversation({
        userId: TEST_OTHER_USER_ID,
        organizationId: null,
      });

      await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

      expect(await conversationExists(elsewhereId)).toBeTrue();
      expect(await conversationExists(unscopedId)).toBeTrue();
    });

    test("keeps the conversations of the other members", async () => {
      const adminConversationId = await addConversation({ userId: TEST_USER_ID, organizationId });

      await deleteOrganizationMemberAs({ userId: TEST_USER_ID, membershipId: memberId });

      expect(await conversationExists(adminConversationId)).toBeTrue();
    });

    test("keeps their conversations when the removal is not allowed", async () => {
      await addMembership({ organizationId, userId: TEST_THIRD_USER_ID, role: "reviewer" });

      await deleteOrganizationMemberAs({ userId: TEST_THIRD_USER_ID, membershipId: memberId });

      expect(await membershipExists(memberId)).toBeTrue();
      expect(await conversationExists(conversationId)).toBeTrue();
    });

    test("keeps the conversations of the last admin who cannot leave", async () => {
      const adminConversationId = await addConversation({ userId: TEST_USER_ID, organizationId });

      await deleteOrganizationMemberAs({
        userId: TEST_USER_ID,
        membershipId: adminMembershipId,
      }).catch(() => undefined);

      expect(await membershipExists(adminMembershipId)).toBeTrue();
      expect(await conversationExists(adminConversationId)).toBeTrue();
    });
  });
});
