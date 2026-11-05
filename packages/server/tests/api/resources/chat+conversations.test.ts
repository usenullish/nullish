import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { Nullable } from "@usenullish/nullish-common";
import { ChatService } from "@usenullish/nullish-engine/chat";
import type { Api } from "@usenullish/nullish-schema/server";
import { MessageRole, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { ApiEnv } from "../../../src/api/types/api";
import { ConversationsHandlers } from "../../../src/api/resources/_chat+conversations";
import { OrganizationConversationsHandlers } from "../../../src/api/resources/_organizations+conversations";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../engine/tests/_test-utils";

type Conversations = Api["Conversations"]["Server"]["GetConversationsResponse"];
type Conversation = Api["Conversations"]["Server"]["GetConversationResponse"];

const LIST_QUERY = "limit=100&offset=0&sort=updatedAt&direction=desc";

describe("chat conversations", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const request = async ({
    userId = TEST_USER_ID,
    method,
    path,
  }: {
    userId?: DbStoreInitArgs["userId"] | null;
    method: "GET" | "DELETE";
    path: string;
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

    ConversationsHandlers.create({ app }).register();
    OrganizationConversationsHandlers.create({ app }).register();

    return await app.request(path, { method });
  };

  const initConversation = async ({
    userId,
    organizationId = null,
    message,
  }: {
    userId: DbStoreInitArgs["userId"];
    organizationId?: Nullable<string>;
    message: string;
  }): Promise<string> => {
    const initialized = await ChatService.create({ db, userId }).init({
      organizationId,
      conversationId: undefined,
      message,
    });

    if (initialized.status === "error") {
      throw initialized.err;
    }

    return initialized.result.conversation.id;
  };

  const list = async ({
    userId,
    query = LIST_QUERY,
  }: {
    userId?: DbStoreInitArgs["userId"];
    query?: string;
  }): Promise<Conversations> => {
    const response = await request({ userId, method: "GET", path: `/chat/conversations?${query}` });

    expect(response.status).toBe(200);

    return (await response.json()) as Conversations;
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

  describe("list", () => {
    test("answers 401 without a session", async () => {
      const response = await request({
        userId: null,
        method: "GET",
        path: `/chat/conversations?${LIST_QUERY}`,
      });

      expect(response.status).toBe(401);
    });

    test("answers 400 for an invalid list query", async () => {
      const response = await request({
        method: "GET",
        path: "/chat/conversations?limit=0&offset=0&sort=updatedAt&direction=desc",
      });

      expect(response.status).toBe(400);
    });

    test("returns only the conversations of the signed-in user with encoded audit fields", async () => {
      const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Mine" });
      const otherConversationId = await initConversation({
        userId: TEST_OTHER_USER_ID,
        message: "Theirs",
      });

      const { conversations } = await list({});

      const ids = conversations.map(({ id }) => id);

      expect(ids).toContain(conversationId);
      expect(ids).not.toContain(otherConversationId);

      const conversation = conversations.find(({ id }) => id === conversationId);

      expect(conversation?.title).toBe("Mine");
      expect(conversation?.createdAt).toEqual({ __timestamp__: expect.any(String) });
      expect(conversation?.updatedAt).toEqual({ __timestamp__: expect.any(String) });
    });

    test("returns only the conversations without organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const inOrganization = await initConversation({
        userId: TEST_USER_ID,
        organizationId,
        message: "In organization",
      });
      const unscoped = await initConversation({ userId: TEST_USER_ID, message: "Unscoped" });

      const { conversations } = await list({});

      const ids = conversations.map(({ id }) => id);

      expect(ids).toContain(unscoped);
      expect(ids).not.toContain(inOrganization);
    });

    test("paginates the conversations", async () => {
      const first = await initConversation({ userId: TEST_USER_ID, message: "Page one" });
      const second = await initConversation({ userId: TEST_USER_ID, message: "Page two" });

      const { conversations: page } = await list({
        query: "limit=1&offset=0&sort=createdAt&direction=desc",
      });

      expect(page.map(({ id }) => id)).toEqual([second]);

      const { conversations: nextPage } = await list({
        query: "limit=1&offset=1&sort=createdAt&direction=desc",
      });

      expect(nextPage.map(({ id }) => id)).toEqual([first]);
    });
  });

  describe("list of an organization", () => {
    test("answers 401 without a session", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const response = await request({
        userId: null,
        method: "GET",
        path: `/organizations/${organizationId}/conversations?${LIST_QUERY}`,
      });

      expect(response.status).toBe(401);
    });

    test("answers 400 for an organization that is not a UUID", async () => {
      const response = await request({
        method: "GET",
        path: `/organizations/not-a-uuid/conversations?${LIST_QUERY}`,
      });

      expect(response.status).toBe(400);
    });

    test("returns only the conversations of the organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const otherOrganizationId = await createOrganization(db, TEST_USER_ID);

      const inOrganization = await initConversation({
        userId: TEST_USER_ID,
        organizationId,
        message: "In organization",
      });
      await initConversation({
        userId: TEST_USER_ID,
        organizationId: otherOrganizationId,
        message: "In other organization",
      });
      await initConversation({ userId: TEST_USER_ID, message: "Unscoped" });

      const response = await request({
        method: "GET",
        path: `/organizations/${organizationId}/conversations?${LIST_QUERY}`,
      });

      expect(response.status).toBe(200);

      const { conversations } = (await response.json()) as Conversations;

      expect(conversations.map(({ id }) => id)).toEqual([inOrganization]);
    });
  });

  describe("getById", () => {
    test("answers 401 without a session", async () => {
      const response = await request({
        userId: null,
        method: "GET",
        path: `/chat/conversations/${TEST_MISSING_ID}`,
      });

      expect(response.status).toBe(401);
    });

    test("answers 400 when the id is not a UUID", async () => {
      const response = await request({ method: "GET", path: "/chat/conversations/not-a-uuid" });

      expect(response.status).toBe(400);
    });

    test("returns a conversation of the signed-in user with its messages", async () => {
      const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Resume" });

      const response = await request({
        method: "GET",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(response.status).toBe(200);

      const { chat } = (await response.json()) as Conversation;

      expect(chat?.conversation.id).toBe(conversationId);
      expect(chat?.conversation.title).toBe("Resume");
      expect(chat?.conversation.organizationId).toBeNull();
      expect(chat?.conversation.createdAt).toEqual({ __timestamp__: expect.any(String) });
      expect(chat?.messages.map(({ role, content }) => ({ role, content }))).toEqual([
        { role: MessageRole.USER, content: "Resume" },
      ]);
      expect(chat?.messages[0]?.createdAt).toEqual({ __timestamp__: expect.any(String) });
    });

    test("answers 404 for a conversation of another user", async () => {
      const conversationId = await initConversation({
        userId: TEST_OTHER_USER_ID,
        message: "Hidden",
      });

      const response = await request({
        method: "GET",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(response.status).toBe(404);
    });

    test("answers 404 for an unknown conversation", async () => {
      const response = await request({
        method: "GET",
        path: `/chat/conversations/${TEST_MISSING_ID}`,
      });

      expect(response.status).toBe(404);
    });
  });

  describe("delete", () => {
    test("answers 401 without a session", async () => {
      const response = await request({
        userId: null,
        method: "DELETE",
        path: `/chat/conversations/${TEST_MISSING_ID}`,
      });

      expect(response.status).toBe(401);
    });

    test("answers 400 when the id is not a UUID", async () => {
      const response = await request({ method: "DELETE", path: "/chat/conversations/not-a-uuid" });

      expect(response.status).toBe(400);
    });

    test("deletes a conversation of the signed-in user", async () => {
      const conversationId = await initConversation({ userId: TEST_USER_ID, message: "Forget" });

      const response = await request({
        method: "DELETE",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(response.status).toBe(204);

      const found = await request({
        method: "GET",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(found.status).toBe(404);
    });

    test("answers 404 for a conversation of another user and keeps it", async () => {
      const conversationId = await initConversation({
        userId: TEST_OTHER_USER_ID,
        message: "Kept",
      });

      const response = await request({
        method: "DELETE",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(response.status).toBe(404);

      const found = await request({
        userId: TEST_OTHER_USER_ID,
        method: "GET",
        path: `/chat/conversations/${conversationId}`,
      });

      expect(found.status).toBe(200);
    });

    test("answers 404 for an unknown conversation", async () => {
      const response = await request({
        method: "DELETE",
        path: `/chat/conversations/${TEST_MISSING_ID}`,
      });

      expect(response.status).toBe(404);
    });
  });
});
