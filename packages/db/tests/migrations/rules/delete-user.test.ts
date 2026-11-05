import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MessageRole } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
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

const deleteUser = (userId: string) => db.delete(users).where(eq(users.id, userId));

const createConversation = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(conversations)
    .values({ userId: TEST_OTHER_USER_ID, organizationId, title: "Conversation" })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("deleting a user", () => {
  let organizationId: string;

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);
    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });
  });

  test("deletes the memberships of the user", async () => {
    await deleteUser(TEST_OTHER_USER_ID);

    const rows = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, TEST_OTHER_USER_ID));

    expect(rows).toEqual([]);
  });

  test("deletes the conversations of the user with their messages", async () => {
    const conversationId = await createConversation(organizationId);
    await db
      .insert(messages)
      .values({ conversationId, position: 0, role: MessageRole.USER, content: "Hello" });

    await deleteUser(TEST_OTHER_USER_ID);

    expect(
      await db.select().from(conversations).where(eq(conversations.id, conversationId)),
    ).toEqual([]);
    expect(
      await db.select().from(messages).where(eq(messages.conversationId, conversationId)),
    ).toEqual([]);
  });

  test("keeps the LLM usages of the user without the user", async () => {
    const [usage] = await db
      .insert(llmUsages)
      .values({
        userId: TEST_OTHER_USER_ID,
        organizationId,
        model: "model",
        inputTokens: 10n,
        outputTokens: 20n,
      })
      .returning();
    assertNonNullish(usage);

    await deleteUser(TEST_OTHER_USER_ID);

    const [row] = await db.select().from(llmUsages).where(eq(llmUsages.id, usage.id));

    expect(row?.userId).toBeNull();
    expect(row?.inputTokens).toBe(10n);
  });

  test("rejects deleting the last admin of an organization", async () => {
    const error = await deleteUser(TEST_USER_ID).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("An organization needs at least one admin");

    const [row] = await db.select().from(users).where(eq(users.id, TEST_USER_ID));

    expect(row).toBeDefined();
  });

  test("keeps the memberships of the other members", async () => {
    await deleteUser(TEST_OTHER_USER_ID);

    const rows = await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));

    expect(rows.map(({ userId }) => userId)).toEqual([TEST_USER_ID]);
  });
});
