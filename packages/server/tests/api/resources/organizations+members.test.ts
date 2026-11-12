import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { OrganizationMembersHandlers } from "../../../src/api/resources/_organizations+members";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const LIST_QUERY = "limit=100&offset=0&sort=createdAt&direction=asc";

describe("organization members", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let admin: { id: string; cookie: string };
  let accountant: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };
  let organizationId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const listMembers = async ({
    cookie,
    authorization,
  }: {
    cookie?: string;
    authorization?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    OrganizationMembersHandlers.create({ app }).register();

    return await app.request(`/organizations/${organizationId}/members?${LIST_QUERY}`, {
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
        ...(nonNullish(authorization) && { Authorization: authorization }),
      },
    });
  };

  const parseMembers = async (response: Response) =>
    ApiSchema.OrganizationMembers.GetOrganizationMembersResponseSchema.parse(await response.json())
      .members;

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

    admin = await signUp({ email: "members-admin@test.local" });
    accountant = await signUp({ email: "members-accountant@test.local" });
    outsider = await signUp({ email: "members-outsider@test.local" });

    organizationId = await createOrganization(db, admin.id);

    await db
      .insert(memberships)
      .values({ organizationId, userId: accountant.id, role: "accountant" });
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE auth.apikeys;`);
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await listMembers({});

    expect(response.status).toBe(401);
  });

  test("lists the members with their name and email to the admin", async () => {
    const response = await listMembers({ cookie: admin.cookie });

    expect(response.status).toBe(200);

    const members = await parseMembers(response);

    expect(members.map(({ email, name, role }) => ({ email, name, role }))).toEqual([
      { email: "members-admin@test.local", name: "members-admin@test.local", role: "admin" },
      {
        email: "members-accountant@test.local",
        name: "members-accountant@test.local",
        role: "accountant",
      },
    ]);
  });

  test("lists no member to a member who is not an admin", async () => {
    const response = await listMembers({ cookie: accountant.cookie });

    expect(response.status).toBe(200);
    expect(await parseMembers(response)).toEqual([]);
  });

  test("lists no member to a user outside the organization", async () => {
    const response = await listMembers({ cookie: outsider.cookie });

    expect(response.status).toBe(200);
    expect(await parseMembers(response)).toEqual([]);
  });

  describe("with an api key", () => {
    const createKey = async ({
      permissions,
    }: {
      permissions: Partial<Record<ApiKeyResource, ApiKeyAction[]>>;
    }) => {
      const { key } = await auth.api.createApiKey({
        body: { userId: admin.id, name: "Members", permissions },
      });

      return key;
    };

    test("lists the members to a key of the admin with the api read permission", async () => {
      const key = await createKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] } });

      const response = await listMembers({ authorization: `Bearer ${key}` });

      expect(response.status).toBe(200);
      expect((await parseMembers(response)).map(({ email }) => email)).toEqual([
        "members-admin@test.local",
        "members-accountant@test.local",
      ]);
    });

    test("answers 401 to a key with only the mcp permissions", async () => {
      const key = await createKey({
        permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
      });

      const response = await listMembers({ authorization: `Bearer ${key}` });

      expect(response.status).toBe(401);
    });
  });
});
