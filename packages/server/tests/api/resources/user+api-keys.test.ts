import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import type { Api } from "@usenullish/nullish-schema/server";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { UserApiKeysHandlers } from "../../../src/api/resources/_user+api-keys";
import { resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

type ApiKeys = Api["UserApiKeys"]["Server"]["GetApiKeysResponse"];
type CreatedApiKey = Api["UserApiKeys"]["Server"]["CreateApiKeyResponse"];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

describe("user api-keys", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let otherCookie: string;
  let userId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const request = async ({
    method,
    path = "/user/api-keys",
    cookie,
    authorization,
    body,
  }: {
    method: "GET" | "POST" | "DELETE";
    path?: string;
    cookie?: string;
    authorization?: string;
    body?: unknown;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    UserApiKeysHandlers.create({ app }).register();

    return await app.request(path, {
      method,
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
        ...(nonNullish(authorization) && { Authorization: authorization }),
        ...(nonNullish(body) && { "Content-Type": "application/json" }),
      },
      ...(nonNullish(body) && { body: JSON.stringify(body) }),
    });
  };

  const create = async ({
    cookie,
    body,
  }: {
    cookie: string;
    body: Record<string, unknown>;
  }): Promise<CreatedApiKey> => {
    const response = await request({ method: "POST", cookie, body });

    expect(response.status).toBe(201);

    return (await response.json()) as CreatedApiKey;
  };

  const list = async ({ cookie }: { cookie: string }): Promise<ApiKeys> => {
    const response = await request({ method: "GET", cookie });

    expect(response.status).toBe(200);

    return (await response.json()) as ApiKeys;
  };

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
        emailAndPassword: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);
    await db.execute(sql`TRUNCATE auth.apikeys;`);

    const user = await signUp({ email: "api-keys@test.local" });
    const other = await signUp({ email: "api-keys-other@test.local" });

    userId = user.id;
    cookie = user.cookie;
    otherCookie = other.cookie;
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE auth.apikeys;`);
    await resetDb(db);
    await instance.close();
  });

  describe("without a session", () => {
    test("answers 401 to the list", async () => {
      const response = await request({ method: "GET" });

      expect(response.status).toBe(401);
    });

    test("answers 401 to the creation", async () => {
      const response = await request({
        method: "POST",
        body: {
          name: "No session",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      expect(response.status).toBe(401);
    });

    test("answers 401 to the deletion", async () => {
      const response = await request({ method: "DELETE", path: "/user/api-keys/some-key-id" });

      expect(response.status).toBe(401);
    });
  });

  describe("with an api key", () => {
    test("answers 401 to the list for a key with the api read and write permissions", async () => {
      const { key } = await auth.api.createApiKey({
        body: {
          userId,
          name: "Api",
          permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        },
      });

      const response = await request({ method: "GET", authorization: `Bearer ${key}` });

      expect(response.status).toBe(401);
    });
  });

  describe("create", () => {
    test("returns the full key once with the requested permissions", async () => {
      const { key, apiKey } = await create({
        cookie,
        body: {
          name: "Read and write",
          expiresInDays: 30,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        },
      });

      expect(apiKey.permissions).toEqual({
        [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE],
      });

      const verified = await auth.api.verifyApiKey({
        body: {
          key,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.WRITE] },
        },
      });

      expect(verified.valid).toBeTrue();
      expect(verified.key?.referenceId).toBe(userId);
    });

    test.each([ApiKeyResource.MCP, ApiKeyResource.API].map((resource) => [resource]))(
      "answers 400 to a %s write permission without the read permission",
      async (resource) => {
        const response = await request({
          method: "POST",
          cookie,
          body: {
            name: "Write only",
            expiresInDays: 7,
            permissions: { [resource]: [ApiKeyAction.WRITE] },
          },
        });

        expect(response.status).toBe(400);
      },
    );

    test("expires after the requested number of days", async () => {
      const before = Date.now();

      const { apiKey } = await create({
        cookie,
        body: {
          name: "Thirty days",
          expiresInDays: 30,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      assertNonNullish(apiKey.expiresAt);

      const expiresAt = new Date(apiKey.expiresAt.__timestamp__).getTime();

      expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * DAY_IN_MS);
      expect(expiresAt).toBeLessThan(before + 31 * DAY_IN_MS);
    });

    test("returns only the keys of the signed-in user", async () => {
      const own = await create({
        cookie,
        body: {
          name: "Own",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      const others = await create({
        cookie: otherCookie,
        body: {
          name: "Others",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      const { apiKeys } = await list({ cookie });
      const ids = apiKeys.map(({ id }) => id);

      expect(ids).toContain(own.apiKey.id);
      expect(ids).not.toContain(others.apiKey.id);
    });

    test("never returns the key itself", async () => {
      const { key, apiKey } = await create({
        cookie,
        body: {
          name: "Secret",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      const response = await request({ method: "GET", cookie });
      const text = await response.text();

      expect(text).not.toContain(key);
      expect(text).toContain(apiKey.id);
    });
  });

  describe("delete", () => {
    afterEach(() => {
      spyOn(console, "error").mockRestore();
    });

    test("deletes a key of the signed-in user", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const { key, apiKey } = await create({
        cookie,
        body: {
          name: "To delete",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      const response = await request({
        method: "DELETE",
        path: `/user/api-keys/${apiKey.id}`,
        cookie,
      });

      expect(response.status).toBe(204);

      const { apiKeys } = await list({ cookie });
      expect(apiKeys.map(({ id }) => id)).not.toContain(apiKey.id);

      const verified = await auth.api.verifyApiKey({ body: { key } });
      expect(verified.valid).toBeFalse();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("answers 404 for a key of another user and keeps it", async () => {
      const { key, apiKey } = await create({
        cookie: otherCookie,
        body: {
          name: "Not mine",
          expiresInDays: 7,
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] },
        },
      });

      const response = await request({
        method: "DELETE",
        path: `/user/api-keys/${apiKey.id}`,
        cookie,
      });

      expect(response.status).toBe(404);

      const verified = await auth.api.verifyApiKey({ body: { key } });
      expect(verified.valid).toBeTrue();
    });
  });
});
