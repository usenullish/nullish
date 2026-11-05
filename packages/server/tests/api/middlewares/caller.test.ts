import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

describe("caller middleware", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let userId: string;
  let cookie: string;

  const request = async ({
    authorization,
    cookie,
  }: { authorization?: string; cookie?: string } = {}): Promise<Response> => {
    const app = new Hono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("auth", auth);
      await next();
    });

    app.use("*", loadCallerMiddleware());

    app.all("/mcp", (context) => context.json({ caller: context.var.caller }));

    return await app.request("/mcp", {
      method: "POST",
      headers: {
        ...(nonNullish(authorization) && { Authorization: authorization }),
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
    });
  };

  const createKey = async ({
    permissions = { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
  }: {
    permissions?: Record<string, ApiKeyAction[]>;
  } = {}) =>
    await auth.api.createApiKey({
      body: {
        userId,
        name: "Test",
        permissions,
      },
    });

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;
    auth = createAuth({
      db,
      env: {
        signUp: true,
        autoSignIn: true,
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);
    await db.execute(sql`TRUNCATE auth.apikeys;`);

    const { headers, response } = await auth.api.signUpEmail({
      body: { email: "caller-middleware@test.local", password: "password-1234", name: "Test" },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    userId = response.user.id;
    cookie = sessionCookie;
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE auth.apikeys;`);
    await resetDb(db);
    await instance.close();
  });

  test("sets the user of a session cookie", async () => {
    const response = await request({ cookie });

    expect(response.status).toBe(200);

    const { caller } = (await response.json()) as {
      caller: { type: string; user: { id: string } };
    };

    expect(caller.type).toBe("user");
    expect(caller.user.id).toBe(userId);
  });

  test("prefers the api key over a session cookie", async () => {
    const { key } = await createKey();

    const response = await request({ authorization: `Bearer ${key}`, cookie });

    expect(response.status).toBe(200);

    const { caller } = (await response.json()) as { caller: { type: string; userId: string } };

    expect(caller.type).toBe("api-key");
    expect(caller.userId).toBe(userId);
  });

  test("sets no caller without a session or an api key", async () => {
    const response = await request();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ caller: null });
  });

  test("ignores an authorization that is not a bearer", async () => {
    const response = await request({ authorization: "Basic dXNlcjpwYXNzd29yZA==" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ caller: null });
  });

  test("sets the user and the permissions of a valid key", async () => {
    const { key } = await createKey({
      permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
    });

    const response = await request({ authorization: `Bearer ${key}` });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      caller: {
        type: "api-key",
        userId,
        permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
      },
    });
  });

  test("sets the permissions of a key without the mcp permission", async () => {
    const { key } = await createKey({
      permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] },
    });

    const response = await request({ authorization: `Bearer ${key}` });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      caller: {
        type: "api-key",
        userId,
        permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] },
      },
    });
  });

  describe("refused keys", () => {
    afterEach(() => {
      spyOn(console, "error").mockRestore();
    });

    test("answers 401 for an unknown key", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const response = await request({ authorization: "Bearer nullish_unknown" });

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("answers 401 for a disabled key", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const { key, id } = await createKey();

      await auth.api.updateApiKey({ body: { keyId: id, userId, enabled: false } });

      const response = await request({ authorization: `Bearer ${key}` });

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
