import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { CreateInvitationService } from "@usenullish/nullish-engine/core";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { InvitationsHandlers } from "../../../src/api/resources/_organizations+invitations";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const invitations = DbSchema.Core.Invitations.InvitationsSchema;

const LIST_QUERY = "limit=100&offset=0&sort=createdAt&direction=asc";

describe("organization invitations", () => {
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

  const request = async ({
    path,
    method,
    cookie,
  }: {
    path: string;
    method: "GET" | "DELETE";
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    InvitationsHandlers.create({ app }).register();

    return await app.request(path, {
      method,
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
    });
  };

  const listInvitations = ({ cookie }: { cookie?: string }) =>
    request({
      path: `/organizations/${organizationId}/invitations?${LIST_QUERY}`,
      method: "GET",
      cookie,
    });

  const invite = async ({ email }: { email: string }): Promise<string> => {
    const result = await CreateInvitationService.create({
      db,
      userId: admin.id,
      organizationId,
      values: { email, role: "accountant" },
    }).create();

    if (result.status === "error") {
      throw result.err;
    }

    return result.result.invitation.id;
  };

  const revoke = ({ cookie, invitationId }: { cookie?: string; invitationId: string }) =>
    request({ path: `/invitations/${invitationId}`, method: "DELETE", cookie });

  const invitationExists = async (id: string): Promise<boolean> => {
    const rows = await db.select().from(invitations).where(eq(invitations.id, id));
    return rows.length === 1;
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

  describe("list", () => {
    test("answers 401 without a session", async () => {
      const response = await listInvitations({});

      expect(response.status).toBe(401);
    });

    test("lists the invitations to the admin", async () => {
      const invitationId = await invite({ email: "listed@test.local" });

      const response = await listInvitations({ cookie: admin.cookie });

      expect(response.status).toBe(200);

      const { invitations: listed } = ApiSchema.Invitations.GetInvitationsResponseSchema.parse(
        await response.json(),
      );

      expect(listed.map(({ id }) => id)).toContain(invitationId);
    });

    test("lists no invitation to a member who is not an admin", async () => {
      const response = await listInvitations({ cookie: accountant.cookie });

      expect(response.status).toBe(200);
      expect(
        ApiSchema.Invitations.GetInvitationsResponseSchema.parse(await response.json()).invitations,
      ).toEqual([]);
    });

    test("lists no invitation to a user outside the organization", async () => {
      const response = await listInvitations({ cookie: outsider.cookie });

      expect(response.status).toBe(200);
      expect(
        ApiSchema.Invitations.GetInvitationsResponseSchema.parse(await response.json()).invitations,
      ).toEqual([]);
    });
  });

  describe("delete", () => {
    test("answers 401 without a session", async () => {
      const response = await revoke({ invitationId: crypto.randomUUID() });

      expect(response.status).toBe(401);
    });

    test("revokes the invitation for the admin", async () => {
      const invitationId = await invite({ email: "revoked@test.local" });

      const response = await revoke({ cookie: admin.cookie, invitationId });

      expect(response.status).toBe(204);
      expect(await invitationExists(invitationId)).toBeFalse();
    });

    test("answers 404 to a member who is not an admin", async () => {
      const invitationId = await invite({ email: "kept-member@test.local" });

      const response = await revoke({ cookie: accountant.cookie, invitationId });

      expect(response.status).toBe(404);
      expect(await invitationExists(invitationId)).toBeTrue();
    });

    test("answers 404 to a user outside the organization", async () => {
      const invitationId = await invite({ email: "kept-outsider@test.local" });

      const response = await revoke({ cookie: outsider.cookie, invitationId });

      expect(response.status).toBe(404);
      expect(await invitationExists(invitationId)).toBeTrue();
    });
  });
});
