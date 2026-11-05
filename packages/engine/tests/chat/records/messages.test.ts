import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { MessageRole } from "@usenullish/nullish-schema/db";
import { DbConversations } from "../../../src/chat/records/conversations";
import { DbCollectionMessages } from "../../../src/chat/records/messages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_OTHER_USER_ID, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const createConversation = async (userId: DbStoreInitArgs["userId"]): Promise<string> => {
  const created = await DbConversations.create({
    db: db as unknown as DbStoreInitArgs["db"],
    userId,
  }).insert({ values: { organizationId: null, title: null } });

  if (created.status === "error") {
    throw created.err;
  }

  return created.result.id;
};

const messagesFor = ({
  userId,
  conversationId,
}: {
  userId: DbStoreInitArgs["userId"];
  conversationId: string;
}): DbCollectionMessages =>
  DbCollectionMessages.create({
    db: db as unknown as DbStoreInitArgs["db"],
    userId,
    foreignKeyId: conversationId,
  });

describe("messages", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("insert", () => {
    test("appends the messages one position after the other", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      const first = await store.insert({
        values: { role: MessageRole.USER, content: "Hello" },
      });
      const second = await store.insert({
        values: { role: MessageRole.ASSISTANT, content: "Hi" },
      });

      if (first.status === "error" || second.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(first.result.position).toBe(0);
      expect(second.result.position).toBe(1);
      expect(second.result.conversationId).toBe(conversationId);
    });

    test("stores the tool calls of an assistant message and the result of a tool", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      const toolCalls = [
        {
          id: "call_1",
          type: "function" as const,
          function: { name: "list_clients", arguments: "{}" },
        },
      ];

      const assistant = await store.insert({
        values: { role: MessageRole.ASSISTANT, content: null, toolCalls },
      });
      const tool = await store.insert({
        values: { role: MessageRole.TOOL, content: "[]", toolCallId: "call_1" },
      });

      if (assistant.status === "error" || tool.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(assistant.result.toolCalls).toEqual(toolCalls);
      expect(tool.result.toolCallId).toBe("call_1");
    });

    test("returns an error Result for a conversation of another user", async () => {
      const conversationId = await createConversation(TEST_OTHER_USER_ID);

      const result = await messagesFor({ userId: TEST_USER_ID, conversationId }).insert({
        values: { role: MessageRole.USER, content: "Intruder" },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list", () => {
    test("returns the messages of the conversation by position", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await store.insert({ values: { role: MessageRole.USER, content: "One" } });
      await store.insert({ values: { role: MessageRole.ASSISTANT, content: "Two" } });
      await store.insert({ values: { role: MessageRole.USER, content: "Three" } });

      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ content }) => content)).toEqual(["One", "Two", "Three"]);
    });

    test("returns nothing for a conversation of another user", async () => {
      const conversationId = await createConversation(TEST_OTHER_USER_ID);

      await messagesFor({ userId: TEST_OTHER_USER_ID, conversationId }).insert({
        values: { role: MessageRole.USER, content: "Private" },
      });

      const result = await messagesFor({ userId: TEST_USER_ID, conversationId }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns at most limit messages", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await store.insert({ values: { role: MessageRole.USER, content: "One" } });
      await store.insert({ values: { role: MessageRole.ASSISTANT, content: "Two" } });

      const result = await store.list({
        pagination: { limit: 1, offset: 0 },
        sort: { field: "position", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ content }) => content)).toEqual(["One"]);
    });
  });

  describe("list filters", () => {
    const insertAll = async ({
      store,
      contents,
    }: {
      store: DbCollectionMessages;
      contents: string[];
    }) => {
      for (const content of contents) {
        await store.insert({ values: { role: MessageRole.USER, content } });
      }
    };

    test("returns the latest messages before the position", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await insertAll({ store, contents: ["Zero", "One", "Two", "Three", "Four"] });

      const result = await store.list({
        pagination: { limit: 2, offset: 0 },
        sort: { field: "position", direction: "desc" },
        filters: { positionBefore: 3 },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ content }) => content)).toEqual(["Two", "One"]);
    });

    test("returns no message before the first position", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await insertAll({ store, contents: ["Zero", "One"] });

      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "desc" },
        filters: { positionBefore: 0 },
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns only the messages with text", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await store.insert({ values: { role: MessageRole.USER, content: "Question" } });
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

      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
        filters: { textOnly: true },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ content }) => content)).toEqual(["Question", "Answer"]);
    });

    test("returns every message of the conversation when no filter is set", async () => {
      const conversationId = await createConversation(TEST_USER_ID);
      const store = messagesFor({ userId: TEST_USER_ID, conversationId });

      await insertAll({ store, contents: ["Zero", "One"] });

      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
        filters: {},
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ content }) => content)).toEqual(["Zero", "One"]);
    });
  });
});
