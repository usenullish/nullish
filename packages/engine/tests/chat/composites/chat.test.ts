import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { MessageRole, QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";
import { DbChat } from "../../../src/chat/composites/chat";
import { DbConversations } from "../../../src/chat/records/conversations";
import { DbCollectionMessages } from "../../../src/chat/records/messages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const argsFor = (userId: DbStoreInitArgs["userId"]): DbStoreInitArgs => ({
  db: db as unknown as DbStoreInitArgs["db"],
  userId,
});

const createConversation = async ({
  userId,
  contents,
}: {
  userId: DbStoreInitArgs["userId"];
  contents: string[];
}): Promise<string> => {
  const created = await DbConversations.create(argsFor(userId)).insert({
    values: { organizationId: null, title: null },
  });

  if (created.status === "error") {
    throw created.err;
  }

  const messages = DbCollectionMessages.create({
    ...argsFor(userId),
    foreignKeyId: created.result.id,
  });

  for (const content of contents) {
    const inserted = await messages.insert({ values: { role: MessageRole.USER, content } });

    if (inserted.status === "error") {
      throw inserted.err;
    }
  }

  return created.result.id;
};

describe("DbChat", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the conversation with its messages in order", async () => {
      const conversationId = await createConversation({
        userId: TEST_USER_ID,
        contents: ["First", "Second", "Third"],
      });

      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({ pKey: conversationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.conversation.id).toBe(conversationId);
      expect(result.result?.messages.map(({ content }) => content)).toEqual([
        "First",
        "Second",
        "Third",
      ]);
    });

    test("returns only the latest page of messages in order", async () => {
      const contents = Array.from(
        { length: QUERY_DEFAULT_PAGINATION + 2 },
        (_, index) => `Message ${index}`,
      );

      const conversationId = await createConversation({ userId: TEST_USER_ID, contents });

      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({ pKey: conversationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.messages.map(({ content }) => content)).toEqual(contents.slice(2));
    });

    test("returns only the messages with text", async () => {
      const conversationId = await createConversation({
        userId: TEST_USER_ID,
        contents: ["Question"],
      });

      const store = DbCollectionMessages.create({
        ...argsFor(TEST_USER_ID),
        foreignKeyId: conversationId,
      });

      await store.insert({
        values: {
          role: MessageRole.ASSISTANT,
          content: null,
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "list_clients", arguments: "{}" },
            },
          ],
        },
      });
      await store.insert({
        values: { role: MessageRole.TOOL, content: "[]", toolCallId: "call_1" },
      });
      await store.insert({ values: { role: MessageRole.ASSISTANT, content: "Answer" } });

      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({ pKey: conversationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.messages.map(({ content }) => content)).toEqual(["Question", "Answer"]);
    });

    test("returns no messages for a conversation without messages", async () => {
      const conversationId = await createConversation({ userId: TEST_USER_ID, contents: [] });

      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({ pKey: conversationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.messages).toEqual([]);
    });

    test("resolves to undefined for a conversation of another user", async () => {
      const conversationId = await createConversation({
        userId: TEST_OTHER_USER_ID,
        contents: ["Private"],
      });

      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({ pKey: conversationId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await DbChat.create(argsFor(TEST_USER_ID)).find({
        pKey: TEST_MISSING_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
