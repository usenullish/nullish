import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish, type Nullable } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const conversations = DbSchema.Chat.Conversations.ConversationsSchema;

const createConversation = async (organizationId: Nullable<string>): Promise<string> => {
  const [row] = await db
    .insert(conversations)
    .values({ userId: TEST_USER_ID, organizationId, title: "Conversation" })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const setOrganization = (conversationId: string, organizationId: Nullable<string>) =>
  db
    .update(conversations)
    .set({ organizationId })
    .where(eq(conversations.id, conversationId))
    .catch((e: unknown) => e);

describe("check_organization_immutable on chat.conversations", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("rejects moving a conversation to another organization", async () => {
    const conversationId = await createConversation(organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await setOrganization(conversationId, otherOrganizationId);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("rejects detaching a conversation from its organization", async () => {
    const conversationId = await createConversation(organizationId);

    const error = await setOrganization(conversationId, null);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("rejects attaching a conversation without organization to one", async () => {
    const conversationId = await createConversation(null);

    const error = await setOrganization(conversationId, organizationId);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows updating the title of a conversation", async () => {
    const conversationId = await createConversation(organizationId);

    const [row] = await db
      .update(conversations)
      .set({ title: "Renamed" })
      .where(eq(conversations.id, conversationId))
      .returning();

    expect(row?.title).toBe("Renamed");
  });

  test("allows updating the title of a conversation without organization", async () => {
    const conversationId = await createConversation(null);

    const [row] = await db
      .update(conversations)
      .set({ title: "Renamed" })
      .where(eq(conversations.id, conversationId))
      .returning();

    expect(row?.title).toBe("Renamed");
    expect(row?.organizationId).toBeNull();
  });
});
