import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { InvitationsCreateHandlers } from "../../../src/api/resources/_organizations+invitations+create";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

describe("create invitation", () => {
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

  const invite = async ({
    cookie,
    email,
    role = "accountant",
  }: {
    cookie?: string;
    email: string;
    role?: "admin" | "accountant" | "reviewer";
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    InvitationsCreateHandlers.create({ app }).register();

    return await app.request(`/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
      body: JSON.stringify({ email, role }),
    });
  };

  const parseCreated = async (response: Response) =>
    ApiSchema.InvitationsCreate.CreateInvitationResponseSchema.parse(await response.json());

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

    admin = await signUp({ email: "invitations-admin@test.local" });
    accountant = await signUp({ email: "invitations-accountant@test.local" });
    outsider = await signUp({ email: "invitations-outsider@test.local" });

    organizationId = await createOrganization(db, admin.id);

    await db
      .insert(memberships)
      .values({ organizationId, userId: accountant.id, role: "accountant" });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await invite({ email: "anonymous@test.local" });

    expect(response.status).toBe(401);
  });

  test("creates the invitation and returns it with its token to the admin", async () => {
    const response = await invite({
      cookie: admin.cookie,
      email: "created@test.local",
      role: "admin",
    });

    expect(response.status).toBe(201);

    const { invitation, token } = await parseCreated(response);

    expect(invitation.organizationId).toBe(organizationId);
    expect(invitation.email).toBe("created@test.local");
    expect(invitation.role).toBe("admin");
    expect(invitation.expiresAt).toBeInstanceOf(Date);
    expect(invitation).not.toHaveProperty("tokenHash");
    expect(token.length).toBeGreaterThan(0);
  });

  test("answers 400 to an invalid email", async () => {
    const response = await invite({ cookie: admin.cookie, email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  test("answers 500 to an email already invited", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      await invite({ cookie: admin.cookie, email: "twice@test.local" });

      const response = await invite({ cookie: admin.cookie, email: "Twice@test.local" });

      expect(response.status).toBe(500);
      const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
      expect(error.code).toBe(ErrorCode.UNEXPECTED);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test("answers 500 to a member who is not an admin", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await invite({
        cookie: accountant.cookie,
        email: "byaccountant@test.local",
      });

      expect(response.status).toBe(500);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test("answers 500 to a user outside the organization", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await invite({ cookie: outsider.cookie, email: "byoutsider@test.local" });

      expect(response.status).toBe(500);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
