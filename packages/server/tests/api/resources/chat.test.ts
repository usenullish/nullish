import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  spyOn,
  test,
} from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import type { Storage } from "@usenullish/nullish-storage";
import type { ApiEnv } from "../../../src/api/types/api";
import { nonNullish } from "@usenullish/nullish-common";
import { ChatHandlers } from "../../../src/api/resources/_chat";
import {
  createClient,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../engine/tests/_test-utils";
import {
  llmRequestBody,
  mockLlm,
  textAnswer,
  textAnswerWithUsage,
  toolCallAnswer,
} from "../../../../chat/tests/_test-utils";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { DbSchema, MessageRole, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { DbCollectionMessages } from "@usenullish/nullish-engine/chat";
import { DbLlmUsages } from "@usenullish/nullish-engine/metering";
import { LlmMeter } from "@usenullish/nullish-metering";
import { eq } from "drizzle-orm";

type ChatEvent = Api["Chat"]["Client"]["ChatEvent"];

const llmReservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

const LIST_QUERY = { limit: 100, offset: 0, sort: "createdAt", direction: "asc" };

const MESSAGE = "Who are my clients?";

describe("chat", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let orgId: string;
  let clientId: string;
  let fetchSpy: Mock<typeof fetch> | undefined;

  const server = { timeout: mock((_request: Request, _seconds: number) => {}) };

  const request = async ({
    userId = TEST_USER_ID,
    role,
    body,
  }: {
    userId?: DbStoreInitArgs["userId"] | null;
    role?: Records["Core"]["Memberships"]["Select"]["role"];
    body: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    const opened = await LlmMeter.open({
      db,
      userId: userId ?? TEST_USER_ID,
      reservedTokens: 16000n,
      expiresInSeconds: 300,
    });

    if (opened.status === "error") {
      throw opened.err;
    }

    app.use("*", async (context, next) => {
      context.set("db", { connection: db });
      context.set("workers", { jobs: {} as TriggerJobs, storage: {} as Storage });
      context.set(
        "caller",
        userId === null
          ? null
          : ({
              type: "user",
              userId,
              user: {
                id: userId,
                ...(nonNullish(role) && { roles: [{ role, organizationId: orgId }] }),
              },
            } as ApiEnv["Variables"]["caller"]),
      );
      context.set("llm", { meter: opened.result });
      await next();
    });

    ChatHandlers.create({ app }).register();

    return await app.request(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      { server },
    );
  };

  const readEvents = async (response: Response): Promise<ChatEvent[]> =>
    (await response.text())
      .split("\n\n")
      .flatMap((message) => message.split("\n").filter((line) => line.startsWith("data: ")))
      .map((line) => JSON.parse(line.slice("data: ".length)) as ChatEvent);

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;

    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    clientId = await createClient(db, orgId);
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = undefined;
    server.timeout.mockClear();
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("request", () => {
    test("answers 401 without a session", async () => {
      const response = await request({
        userId: null,
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      expect(response.status).toBe(401);
    });

    test("answers 400 when the body is not valid JSON", async () => {
      const response = await request({ body: "{ not json" });

      expect(response.status).toBe(400);
    });

    test("answers 400 when the organization is not a UUID", async () => {
      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: "not-a-uuid" },
          message: MESSAGE,
        }),
      });

      expect(response.status).toBe(400);
    });

    test("answers 400 when the domain is unknown", async () => {
      const response = await request({
        body: JSON.stringify({ domain: { type: "everything" }, message: MESSAGE }),
      });

      expect(response.status).toBe(400);
    });

    test("answers 400 when the organization domain has no organization", async () => {
      const response = await request({
        body: JSON.stringify({ domain: { type: "organization" }, message: MESSAGE }),
      });

      expect(response.status).toBe(400);
    });

    test("answers 400 when the message is empty", async () => {
      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: "",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("answers 400 when the conversation is not a UUID", async () => {
      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          conversationId: "not-a-uuid",
          message: MESSAGE,
        }),
      });

      expect(response.status).toBe(400);
    });

    test("does not call the model when the request is invalid", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: "",
        }),
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    describe("errors", () => {
      let consoleErrorSpy: Mock<typeof console.error>;

      beforeEach(() => {
        consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      test("answers 422 for an organization the user is not a member of", async () => {
        fetchSpy = mockLlm([textAnswer("Hello.")]);

        const response = await request({
          userId: TEST_OTHER_USER_ID,
          body: JSON.stringify({
            domain: { type: "organization", organizationId: orgId },
            message: MESSAGE,
          }),
        });

        expect(response.status).toBe(422);
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("stream", () => {
    test("streams the events of the chat as server-sent events", async () => {
      fetchSpy = mockLlm([textAnswer("Hello", " there.")]);

      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");

      expect(await readEvents(response)).toEqual([
        { type: "conversation", conversationId: expect.any(String) },
        { type: "text", delta: "Hello" },
        { type: "text", delta: " there." },
        { type: "done" },
      ]);
    });

    test("extends the idle timeout of the Bun server for the request", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      await response.text();

      expect(server.timeout).toHaveBeenCalledTimes(1);
      expect(server.timeout.mock.calls[0]?.[1]).toBe(300);
    });

    test("names each server-sent event after its type", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      const names = (await response.text())
        .split("\n")
        .filter((line) => line.startsWith("event: "))
        .map((line) => line.slice("event: ".length));

      expect(names).toEqual(["conversation", "text", "done"]);
    });

    test("exposes the MCP tools of the server to the model", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      await response.text();

      const { tools } = llmRequestBody({ fetchSpy, call: 0 });

      expect(tools.map(({ function: { name } }) => name)).toContain("list_clients");
    });

    test.each(["admin", "accountant"] as const)(
      "exposes the write tools to an %s of the organization",
      async (role) => {
        fetchSpy = mockLlm([textAnswer("Hello.")]);

        const response = await request({
          role,
          body: JSON.stringify({
            domain: { type: "organization", organizationId: orgId },
            message: MESSAGE,
          }),
        });

        await response.text();

        const { tools } = llmRequestBody({ fetchSpy, call: 0 });

        expect(tools.map(({ function: { name } }) => name)).toContain("create_client");
      },
    );

    test("exposes only the read-only tools to a reviewer of the organization", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const response = await request({
        role: "reviewer",
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      await response.text();

      const names = llmRequestBody({ fetchSpy, call: 0 }).tools.map(
        ({ function: { name } }) => name,
      );

      expect(names).toContain("list_clients");
      expect(names.every((name) => name.startsWith("list_") || name.startsWith("get_"))).toBeTrue();
    });
  });

  describe("tools", () => {
    const listClients = async ({
      userId,
    }: {
      userId: DbStoreInitArgs["userId"];
    }): Promise<{ events: ChatEvent[]; toolResult: string | undefined }> => {
      const spy = mockLlm([
        toolCallAnswer({
          id: "call_1",
          name: "list_clients",
          args: JSON.stringify({ query: LIST_QUERY }),
        }),
        textAnswer("Here are your clients."),
      ]);

      fetchSpy = spy;

      const events = await readEvents(
        await request({
          userId,
          body: JSON.stringify({
            domain: { type: "organization", organizationId: orgId },
            message: MESSAGE,
          }),
        }),
      );

      const { messages } = llmRequestBody({ fetchSpy: spy, call: 1 });

      return { events, toolResult: messages.at(-1)?.content ?? undefined };
    };

    test("calls the tools with the data of the user", async () => {
      const { events, toolResult } = await listClients({ userId: TEST_USER_ID });

      expect(events).toEqual([
        { type: "conversation", conversationId: expect.any(String) },
        { type: "tool_call", name: "list_clients" },
        { type: "tool_result", name: "list_clients" },
        { type: "text", delta: "Here are your clients." },
        { type: "done" },
      ]);

      expect(toolResult).toContain(clientId);
    });

    test("exposes only the read-only tools in the unscoped domain", async () => {
      const spy = mockLlm([textAnswer("Hello.")]);

      fetchSpy = spy;

      await readEvents(
        await request({
          body: JSON.stringify({ domain: { type: "unscoped" }, message: MESSAGE }),
        }),
      );

      const names = llmRequestBody({ fetchSpy: spy, call: 0 }).tools.map(
        ({ function: { name } }) => name,
      );

      expect(names).toContain("list_organizations");
      expect(names).toContain("list_clients");
      expect(names).not.toContain("create_organization");
      expect(names).not.toContain("create_client");
    });
  });

  describe("conversations", () => {
    const chat = async ({
      userId,
      conversationId,
      message,
    }: {
      userId?: DbStoreInitArgs["userId"];
      conversationId?: string;
      message: string;
    }): Promise<ChatEvent[]> =>
      await readEvents(
        await request({
          userId,
          body: JSON.stringify({
            domain: { type: "organization", organizationId: orgId },
            conversationId,
            message,
          }),
        }),
      );

    const conversationIdOf = (events: ChatEvent[]): string => {
      const event = events.find(({ type }) => type === "conversation");

      if (event?.type !== "conversation") {
        throw new Error("No conversation event.");
      }

      return event.conversationId;
    };

    const storedMessages = async (conversationId: string) => {
      const result = await DbCollectionMessages.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: conversationId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
      });

      if (result.status === "error") {
        throw result.err;
      }

      return result.result.map(({ role, content }) => ({ role, content }));
    };

    test("records the message of the user and the answer", async () => {
      fetchSpy = mockLlm([textAnswer("You have one client.")]);

      const events = await chat({ message: MESSAGE });

      expect(await storedMessages(conversationIdOf(events))).toEqual([
        { role: MessageRole.USER, content: MESSAGE },
        { role: MessageRole.ASSISTANT, content: "You have one client." },
      ]);
    });

    test("continues a conversation with its history", async () => {
      fetchSpy = mockLlm([textAnswer("You have one client.")]);

      const first = await chat({ message: MESSAGE });
      const conversationId = conversationIdOf(first);

      fetchSpy.mockRestore();
      const spy = mockLlm([textAnswer("It is Acme.")]);
      fetchSpy = spy;

      const second = await chat({ conversationId, message: "What is its name?" });

      expect(conversationIdOf(second)).toBe(conversationId);
      expect(llmRequestBody({ fetchSpy: spy, call: 0 }).messages.slice(1)).toEqual([
        { role: "user", content: MESSAGE },
        { role: "assistant", content: "You have one client." },
        { role: "user", content: "What is its name?" },
      ]);
    });

    describe("errors", () => {
      let consoleErrorSpy: Mock<typeof console.error>;

      beforeEach(() => {
        consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      test("answers 422 for a conversation of another user", async () => {
        fetchSpy = mockLlm([textAnswer("You have one client.")]);

        const events = await chat({ message: MESSAGE });

        const response = await request({
          userId: TEST_OTHER_USER_ID,
          body: JSON.stringify({
            domain: { type: "unscoped" },
            conversationId: conversationIdOf(events),
            message: "Show me the history.",
          }),
        });

        expect(response.status).toBe(422);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    test("links the usage to the conversation", async () => {
      fetchSpy = mockLlm([
        textAnswerWithUsage({ text: "Hello.", promptTokens: 10, completionTokens: 2 }),
      ]);

      const events = await chat({ message: MESSAGE });
      const conversationId = conversationIdOf(events);

      const usages = await DbLlmUsages.create({ db, userId: TEST_USER_ID }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "loggedAt", direction: "desc" },
      });

      if (usages.status === "error") {
        throw usages.err;
      }

      expect(usages.result.filter((usage) => usage.conversationId === conversationId)).toHaveLength(
        1,
      );
    });
  });

  describe("errors", () => {
    let consoleErrorSpy: Mock<typeof console.error>;

    beforeAll(() => {
      consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    });

    afterAll(() => {
      consoleErrorSpy.mockRestore();
    });

    test("streams an error event when the model is not available", async () => {
      fetchSpy = mockLlm([
        new Response(JSON.stringify({ error: { message: "Bad request" } }), { status: 400 }),
      ]);

      const response = await request({
        body: JSON.stringify({
          domain: { type: "organization", organizationId: orgId },
          message: MESSAGE,
        }),
      });

      expect(response.status).toBe(200);
      expect(await readEvents(response)).toEqual([
        { type: "conversation", conversationId: expect.any(String) },
        { type: "error", message: "The assistant is not available." },
      ]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("usage limit", () => {
    const BODY = JSON.stringify({ domain: { type: "unscoped" }, message: MESSAGE });

    const reservationsOf = (userId: DbStoreInitArgs["userId"]) =>
      db.select().from(llmReservations).where(eq(llmReservations.userId, userId));

    beforeEach(() => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "1000000";
    });

    afterEach(async () => {
      delete process.env.NULLISH_LLM_TOKEN_LIMIT;
      await db.delete(llmReservations);
    });

    test("releases the reservation once the chat is done", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const response = await request({ body: BODY });

      await response.text();

      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(0);
    });

    describe("errors", () => {
      let consoleErrorSpy: Mock<typeof console.error>;

      beforeEach(() => {
        consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      test("releases the reservation when the chat ends with an error", async () => {
        fetchSpy = mockLlm([
          new Response(JSON.stringify({ error: { message: "Bad request" } }), { status: 400 }),
        ]);

        const response = await request({ body: BODY });

        expect(await readEvents(response)).toContainEqual({
          type: "error",
          message: "The assistant is not available.",
        });
        expect(await reservationsOf(TEST_USER_ID)).toHaveLength(0);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });
});
