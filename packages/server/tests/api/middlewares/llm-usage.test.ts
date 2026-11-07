import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { envLlmChatModel } from "@usenullish/nullish-env";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../../../src/api/types/api";
import { llmUsageLimitMiddleware } from "../../../src/api/middlewares/llm-usage";
import {
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../engine/tests/_test-utils";

const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;
const llmReservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

describe("llm usage", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const request = async ({
    userId = TEST_USER_ID,
  }: {
    userId?: DbStoreInitArgs["userId"] | null;
  } = {}): Promise<Response> => {
    const app = new Hono<ApiEnv>();

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

    app.post("/chat", llmUsageLimitMiddleware, (context) => context.text("passed"));

    return await app.request("/chat", { method: "POST" });
  };

  const reservationsOf = (userId: DbStoreInitArgs["userId"]) =>
    db.select().from(llmReservations).where(eq(llmReservations.userId, userId));

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;

    await resetDb(db);
    await seedUsers(db);

    await db.insert(llmUsages).values([
      { userId: TEST_USER_ID, model: envLlmChatModel(), inputTokens: 600n, outputTokens: 400n },
      { userId: TEST_OTHER_USER_ID, model: "other-model", inputTokens: 5000n, outputTokens: 5000n },
    ]);
  });

  afterEach(async () => {
    await db.delete(llmReservations);

    delete process.env.NULLISH_LLM_TOKEN_LIMIT;
    delete process.env.NULLISH_LLM_TOKEN_LIMIT_PERIOD;
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("llmUsageLimitMiddleware", () => {
    test("lets the request through without a limit and does not reserve", async () => {
      const response = await request();

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("passed");
      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(0);
    });

    test("lets the request through and reserves while the usage is below the limit", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "1000000";

      const response = await request();

      expect(response.status).toBe(200);

      const reservations = await reservationsOf(TEST_USER_ID);

      expect(reservations).toHaveLength(1);
      expect(reservations[0]?.reservedTokens).toBe(16000n);
    });

    test("answers 429 with the period once the usage reaches the limit", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "1000";
      process.env.NULLISH_LLM_TOKEN_LIMIT_PERIOD = "daily";

      const response = await request();

      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        error: "You have reached the daily usage limit of the assistant.",
        code: ErrorCode.LIMITED,
      });
    });

    test("does not count the usage of other users nor of other models", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "1000";

      const response = await request({ userId: TEST_OTHER_USER_ID });

      expect(response.status).toBe(200);
    });

    test("answers 429 once the reservations of the running requests reach the limit", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "16000";

      const first = await request({ userId: TEST_OTHER_USER_ID });
      const second = await request({ userId: TEST_OTHER_USER_ID });

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
    });

    test("lets only one of parallel requests through when one reservation reaches the limit", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "16000";

      const responses = await Promise.all([
        request({ userId: TEST_OTHER_USER_ID }),
        request({ userId: TEST_OTHER_USER_ID }),
        request({ userId: TEST_OTHER_USER_ID }),
      ]);

      expect(responses.map(({ status }) => status).toSorted()).toEqual([200, 429, 429]);
      expect(await reservationsOf(TEST_OTHER_USER_ID)).toHaveLength(1);
    });

    test("ignores the expired reservations", async () => {
      process.env.NULLISH_LLM_TOKEN_LIMIT = "16000";

      await db.insert(llmReservations).values({
        userId: TEST_OTHER_USER_ID,
        reservedTokens: 16000n,
        expiresAt: new Date(Date.now() - 1000),
      });

      const response = await request({ userId: TEST_OTHER_USER_ID });

      expect(response.status).toBe(200);
    });

    test("answers 401 without a session", async () => {
      const response = await request({ userId: null });

      expect(response.status).toBe(401);
    });
  });
});
