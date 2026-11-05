import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { asc, desc } from "drizzle-orm";
import { DbSchema, MessageRole } from "@usenullish/nullish-schema/db";
import { listMessages } from "../../../src/chat/_helpers/messages";
import { DbConversations } from "../../../src/chat/records/conversations";
import { DbCollectionMessages } from "../../../src/chat/records/messages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const messages = DbSchema.Chat.Messages.MessagesSchema;

const args: DbStoreInitArgs = {
  db: db as unknown as DbStoreInitArgs["db"],
  userId: TEST_USER_ID,
};

const createConversation = async (contents: string[]): Promise<string> => {
  const created = await DbConversations.create(args).insert({
    values: { organizationId: null, title: null },
  });

  if (created.status === "error") {
    throw created.err;
  }

  const store = DbCollectionMessages.create({ ...args, foreignKeyId: created.result.id });

  for (const content of contents) {
    const inserted = await store.insert({ values: { role: MessageRole.USER, content } });

    if (inserted.status === "error") {
      throw inserted.err;
    }
  }

  return created.result.id;
};

describe("chat/_helpers/messages", () => {
  let conversationId: string;
  let otherConversationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    conversationId = await createConversation(["First", "Second", "Third"]);
    otherConversationId = await createConversation(["Other"]);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("listMessages", () => {
    test("returns only the messages of the conversation in order", async () => {
      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId,
          filters: undefined,
          pagination: { limit: 100, offset: 0 },
          orderBy: [asc(messages.position)],
        }),
      );

      expect(result.map(({ content }) => content)).toEqual(["First", "Second", "Third"]);
      expect(result.every((message) => message.conversationId === conversationId)).toBeTrue();
    });

    test("orders and paginates the messages", async () => {
      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId,
          filters: undefined,
          pagination: { limit: 2, offset: 0 },
          orderBy: [desc(messages.position)],
        }),
      );

      expect(result.map(({ content }) => content)).toEqual(["Third", "Second"]);
    });

    test("returns no messages for a conversation without messages", async () => {
      const emptyConversationId = await createConversation([]);

      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId: emptyConversationId,
          filters: undefined,
          pagination: { limit: 100, offset: 0 },
          orderBy: [asc(messages.position)],
        }),
      );

      expect(result).toEqual([]);
    });

    test("excludes the messages of another conversation", async () => {
      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId,
          filters: undefined,
          pagination: { limit: 100, offset: 0 },
          orderBy: [asc(messages.position)],
        }),
      );

      expect(result.map(({ conversationId: id }) => id)).not.toContain(otherConversationId);
    });

    test("keeps only the messages with text", async () => {
      const created = await DbConversations.create(args).insert({
        values: { organizationId: null, title: null },
      });

      if (created.status === "error") {
        throw created.err;
      }

      const store = DbCollectionMessages.create({ ...args, foreignKeyId: created.result.id });

      const toolCalls = [
        {
          id: "call_1",
          type: "function" as const,
          function: { name: "list_clients", arguments: "{}" },
        },
      ];

      await store.insert({ values: { role: MessageRole.USER, content: "Question" } });
      await store.insert({ values: { role: MessageRole.ASSISTANT, content: null, toolCalls } });
      await store.insert({
        values: { role: MessageRole.TOOL, content: "[]", toolCallId: "call_1" },
      });
      await store.insert({ values: { role: MessageRole.ASSISTANT, content: "Answer" } });

      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId: created.result.id,
          filters: { textOnly: true },
          pagination: { limit: 100, offset: 0 },
          orderBy: [asc(messages.position)],
        }),
      );

      expect(result.map(({ content }) => content)).toEqual(["Question", "Answer"]);
    });

    test("returns the messages before the position", async () => {
      const result = await db.transaction((tx) =>
        listMessages({
          tx,
          conversationId,
          filters: { positionBefore: 2 },
          pagination: { limit: 100, offset: 0 },
          orderBy: [asc(messages.position)],
        }),
      );

      expect(result.map(({ content }) => content)).toEqual(["First", "Second"]);
    });
  });
});
