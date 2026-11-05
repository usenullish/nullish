import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../../../src/api/types/api";
import { userRateLimitMiddleware } from "../../../src/api/middlewares/rate-limit";
import { TEST_OTHER_USER_ID, TEST_USER_ID } from "../../../../engine/tests/_test-utils";

const LIMIT = 2;

const createApp = () => {
  const app = new Hono<ApiEnv>();

  app.use("*", async (context, next) => {
    const userId = context.req.header("x-user-id");
    const apiKeyUserId = context.req.header("x-api-key-user-id");

    context.set(
      "caller",
      apiKeyUserId !== undefined
        ? ({ type: "api-key", userId: apiKeyUserId } as ApiEnv["Variables"]["caller"])
        : userId !== undefined
          ? ({ type: "user", userId, user: { id: userId } } as ApiEnv["Variables"]["caller"])
          : null,
    );
    await next();
  });

  app.use("*", userRateLimitMiddleware({ limit: LIMIT }));

  app.get("/", (context) => context.text("passed"));

  return app;
};

const requestAs = ({ app, userId }: { app: Hono<ApiEnv>; userId?: string }) =>
  app.request("/", { headers: userId === undefined ? {} : { "x-user-id": userId } });

const requestTimes = async ({
  app,
  userId,
  times,
}: {
  app: Hono<ApiEnv>;
  userId?: string;
  times: number;
}): Promise<Response[]> => {
  const responses: Response[] = [];

  for (const _ of Array.from({ length: times })) {
    responses.push(await requestAs({ app, userId }));
  }

  return responses;
};

describe("userRateLimitMiddleware", () => {
  test("lets the requests of a user through up to the limit", async () => {
    const app = createApp();

    const responses = await requestTimes({ app, userId: TEST_USER_ID, times: LIMIT });

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
  });

  test("answers 429 with a limited error once the limit is reached", async () => {
    const app = createApp();
    await requestTimes({ app, userId: TEST_USER_ID, times: LIMIT });

    const response = await requestAs({ app, userId: TEST_USER_ID });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many requests. Try again later.",
      code: ErrorCode.LIMITED,
    });
  });

  test("tells when to retry once the limit is reached", async () => {
    const app = createApp();
    await requestTimes({ app, userId: TEST_USER_ID, times: LIMIT });

    const response = await requestAs({ app, userId: TEST_USER_ID });

    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  test("returns the remaining requests in the rate limit headers", async () => {
    const app = createApp();

    const response = await requestAs({ app, userId: TEST_USER_ID });

    expect(response.headers.get("RateLimit")).toMatch(
      new RegExp(`^limit=${LIMIT}, remaining=${LIMIT - 1}, reset=\\d+$`),
    );
    expect(response.headers.get("RateLimit-Policy")).toBe(`${LIMIT};w=60`);
  });

  test("counts the requests of each user separately", async () => {
    const app = createApp();
    await requestTimes({ app, userId: TEST_USER_ID, times: LIMIT + 1 });

    const response = await requestAs({ app, userId: TEST_OTHER_USER_ID });

    expect(response.status).toBe(200);
  });

  test("counts the requests of an API key with those of the session of its user", async () => {
    const app = createApp();
    await requestTimes({ app, userId: TEST_USER_ID, times: LIMIT });

    const response = await app.request("/", { headers: { "x-api-key-user-id": TEST_USER_ID } });

    expect(response.status).toBe(429);
  });

  test("does not count the requests without a caller", async () => {
    const app = createApp();

    const responses = await requestTimes({ app, times: LIMIT + 1 });

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
  });
});
