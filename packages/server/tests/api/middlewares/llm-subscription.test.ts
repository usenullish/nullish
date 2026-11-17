import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import {
  DbSchema,
  type PostgresDbInstance,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../../../src/api/types/api";
import { llmSubscriptionMiddleware } from "../../../src/api/middlewares/llm-subscription";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../../../engine/tests/_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("llm subscription", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const request = async ({
    userId = TEST_USER_ID,
    body,
  }: {
    userId?: DbStoreInitArgs["userId"] | null;
    body: unknown;
  }): Promise<Response> => {
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

    app.post("/chat", llmSubscriptionMiddleware, (context) => context.text("passed"));

    return await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const lock = (organizationId: string) =>
    db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));

  const organizationChat = (organizationId: string) => ({
    domain: { type: "organization", organizationId },
    message: "Hello",
  });

  const unscopedChat = { domain: { type: "unscoped" }, message: "Hello" };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;
  });

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a user", async () => {
    const response = await request({ userId: null, body: unscopedChat });

    expect(response.status).toBe(401);
  });

  test("lets a chat in an organization with a valid subscription through", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const response = await request({ body: organizationChat(organizationId) });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("passed");
  });

  test("rejects a chat in a locked organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await lock(organizationId);

    const response = await request({ body: organizationChat(organizationId) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "The subscription of this organization is not valid.",
      code: ErrorCode.REJECTED,
    });
  });

  test("lets an unscoped chat through when one organization is valid", async () => {
    const lockedId = await createOrganization(db, TEST_USER_ID);
    await createOrganization(db, TEST_USER_ID);
    await lock(lockedId);

    const response = await request({ body: unscopedChat });

    expect(response.status).toBe(200);
  });

  test("rejects an unscoped chat when every organization is locked", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await lock(organizationId);

    const response = await request({ body: unscopedChat });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "None of the organizations has a valid subscription.",
      code: ErrorCode.REJECTED,
    });
  });

  test("rejects an unscoped chat for a user without organization", async () => {
    const response = await request({ body: unscopedChat });

    expect(response.status).toBe(403);
  });

  test("leaves an invalid request to the route", async () => {
    const response = await request({ body: { domain: { type: "unknown" } } });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("passed");
  });
});
