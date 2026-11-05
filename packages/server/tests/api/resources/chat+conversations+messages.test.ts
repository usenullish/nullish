import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { ChatService, MessageService } from "@usenullish/nullish-engine/chat";
import type { Api } from "@usenullish/nullish-schema/server";
import { MessageRole, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { ApiEnv } from "../../../src/api/types/api";
import { MessagesHandlers } from "../../../src/api/resources/_chat+conversations+messages";
import {
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../engine/tests/_test-utils";

type Messages = Api["Messages"]["Server"]["GetMessagesResponse"];

const LIST_QUERY = "limit=100&offset=0&sort=position&direction=asc";

describe("chat conversation messages", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const request = async ({
    userId = TEST_USER_ID,
    conversationId,
    query = LIST_QUERY,
  }: {
    userId?: DbStoreInitArgs["userId"] | null;
    conversationId: string;
    query?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("db", { connection: db });
      context.set(
        "caller",
        userId === null
          ? null
          : ({ type: "user", userId, user: { id: userId } } as ApiEnv["Variables"]["caller"]),
      );
      await next();
    });

    MessagesHandlers.create({ app }).register();

    return await app.request(`/chat/conversations/${conversationId}/messages?${query}`, {
      method: "GET",
    });
  };

  const initConversation = async ({
    userId,
    message,
  }: {
    userId: DbStoreInitArgs["userId"];
    message: string;
  }): Promise<string> => {
    const initialized = await ChatService.create({ db, userId }).init({
      organizationId: null,
      conversationId: undefined,
      message,
    });

    if (initialized.status === "error") {
      throw initialized.err;
    }

    return initialized.result.conversation.id;
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;

    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await request({ userId: null, conversationId: TEST_MISSING_ID });

    expect(response.status).toBe(401);
  });

  test("answers 400 when the conversation is not a UUID", async () => {
    const response = await request({ conversationId: "not-a-uuid" });

    expect(response.status).toBe(400);
  });

  test("answers 400 for an invalid list query", async () => {
    const response = await request({
      conversationId: TEST_MISSING_ID,
      query: "limit=0&offset=0&sort=position&direction=asc",
    });

    expect(response.status).toBe(400);
  });

  test("returns the messages of the conversation in order with encoded timestamps", async () => {
    const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Hello" });

    const recorded = await MessageService.create({
      db,
      userId: TEST_USER_ID,
      conversationId,
    }).record({ message: { role: MessageRole.ASSISTANT, content: "Hi" } });

    expect(recorded.status).toBe("success");

    const response = await request({ conversationId });

    expect(response.status).toBe(200);

    const { messages } = (await response.json()) as Messages;

    expect(messages.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: MessageRole.USER, content: "Hello" },
      { role: MessageRole.ASSISTANT, content: "Hi" },
    ]);
    expect(messages[0]?.createdAt).toEqual({ __timestamp__: expect.any(String) });
  });

  test("paginates the messages", async () => {
    const conversationId = await initConversation({ userId: TEST_USER_ID, message: "First" });

    await MessageService.create({ db, userId: TEST_USER_ID, conversationId }).record({
      message: { role: MessageRole.ASSISTANT, content: "Second" },
    });

    const response = await request({
      conversationId,
      query: "limit=1&offset=1&sort=position&direction=asc",
    });

    expect(response.status).toBe(200);

    const { messages } = (await response.json()) as Messages;

    expect(messages.map(({ content }) => content)).toEqual(["Second"]);
  });

  test("answers 400 for a position filter that is not a number", async () => {
    const response = await request({
      conversationId: TEST_MISSING_ID,
      query: `${LIST_QUERY}&positionBefore=abc`,
    });

    expect(response.status).toBe(400);
  });

  test("returns the latest messages before the position", async () => {
    const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Zero" });

    const messages = MessageService.create({ db, userId: TEST_USER_ID, conversationId });

    await messages.record({ message: { role: MessageRole.ASSISTANT, content: "One" } });
    await messages.record({ message: { role: MessageRole.USER, content: "Two" } });

    const response = await request({
      conversationId,
      query: "limit=1&offset=0&sort=position&direction=desc&positionBefore=2",
    });

    expect(response.status).toBe(200);

    const { messages: page } = (await response.json()) as Messages;

    expect(page.map(({ content }) => content)).toEqual(["One"]);
  });

  test("returns only the messages with text", async () => {
    const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Question" });

    const messages = MessageService.create({ db, userId: TEST_USER_ID, conversationId });

    await messages.record({
      message: {
        role: MessageRole.ASSISTANT,
        content: null,
        toolCalls: [
          { id: "call_1", type: "function", function: { name: "list_clients", arguments: "{}" } },
        ],
      },
    });
    await messages.record({
      message: { role: MessageRole.TOOL, content: "[]", toolCallId: "call_1" },
    });
    await messages.record({ message: { role: MessageRole.ASSISTANT, content: "Answer" } });

    const response = await request({ conversationId, query: `${LIST_QUERY}&textOnly=true` });

    expect(response.status).toBe(200);

    const { messages: page } = (await response.json()) as Messages;

    expect(page.map(({ content }) => content)).toEqual(["Question", "Answer"]);
  });

  test("returns no message for a conversation of another user", async () => {
    const conversationId = await initConversation({
      userId: TEST_OTHER_USER_ID,
      message: "Private",
    });

    const response = await request({ conversationId });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ messages: [] });
  });
});
