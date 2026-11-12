import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { and, eq } from "drizzle-orm";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { MembersDeleteHandlers } from "../../../src/api/resources/_members+delete";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

describe("delete member", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let admin: { id: string; cookie: string };
  let accountant: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const deleteMember = async ({
    membershipId,
    cookie,
  }: {
    membershipId: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    MembersDeleteHandlers.create({ app }).register();

    return await app.request(`/members/${membershipId}`, {
      method: "DELETE",
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
    });
  };

  const insertMembership = async ({
    organizationId,
    userId,
    role,
  }: {
    organizationId: string;
    userId: string;
    role: "admin" | "accountant" | "reviewer";
  }): Promise<string> => {
    const [row] = await db.insert(memberships).values({ organizationId, userId, role }).returning();
    assertNonNullish(row);
    return row.id;
  };

  const adminMembershipId = async (organizationId: string): Promise<string> => {
    const [row] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "admin")));
    assertNonNullish(row);
    return row.id;
  };

  const membershipExists = async (id: string): Promise<boolean> => {
    const rows = await db.select().from(memberships).where(eq(memberships.id, id));
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

    admin = await signUp({ email: "delete-member-admin@test.local" });
    accountant = await signUp({ email: "delete-member-accountant@test.local" });
    outsider = await signUp({ email: "delete-member-outsider@test.local" });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await deleteMember({ membershipId: crypto.randomUUID() });

    expect(response.status).toBe(401);
  });

  test("answers 400 to an id that is not a uuid", async () => {
    const response = await deleteMember({ membershipId: "not-a-uuid", cookie: admin.cookie });

    expect(response.status).toBe(400);
  });

  test("removes a member of the organization of the admin", async () => {
    const otherOrganizationId = await createOrganization(db, admin.id);
    const memberId = await insertMembership({
      organizationId: otherOrganizationId,
      userId: accountant.id,
      role: "accountant",
    });

    const response = await deleteMember({ membershipId: memberId, cookie: admin.cookie });

    expect(response.status).toBe(204);
    expect(await membershipExists(memberId)).toBeFalse();
  });

  test("lets a member leave the organization", async () => {
    const otherOrganizationId = await createOrganization(db, admin.id);
    const ownId = await insertMembership({
      organizationId: otherOrganizationId,
      userId: accountant.id,
      role: "reviewer",
    });

    const response = await deleteMember({ membershipId: ownId, cookie: accountant.cookie });

    expect(response.status).toBe(204);
    expect(await membershipExists(ownId)).toBeFalse();
  });

  test("answers 404 to a member who removes the admin", async () => {
    const otherOrganizationId = await createOrganization(db, admin.id);
    await insertMembership({
      organizationId: otherOrganizationId,
      userId: accountant.id,
      role: "accountant",
    });
    const adminId = await adminMembershipId(otherOrganizationId);

    const response = await deleteMember({ membershipId: adminId, cookie: accountant.cookie });

    expect(response.status).toBe(404);
    expect(await membershipExists(adminId)).toBeTrue();
  });

  test("answers 404 to a user outside the organization", async () => {
    const otherOrganizationId = await createOrganization(db, admin.id);
    const adminId = await adminMembershipId(otherOrganizationId);

    const response = await deleteMember({ membershipId: adminId, cookie: outsider.cookie });

    expect(response.status).toBe(404);
    expect(await membershipExists(adminId)).toBeTrue();
  });

  test("answers 404 to an unknown membership", async () => {
    const response = await deleteMember({
      membershipId: crypto.randomUUID(),
      cookie: admin.cookie,
    });

    expect(response.status).toBe(404);
  });

  test("answers 422 with the reason to the last admin who leaves", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const otherOrganizationId = await createOrganization(db, admin.id);
      const adminId = await adminMembershipId(otherOrganizationId);

      const response = await deleteMember({ membershipId: adminId, cookie: admin.cookie });

      expect(response.status).toBe(422);
      const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
      expect(error.code).toBe(ErrorCode.REJECTED);
      expect(error.error).toContain("An organization needs at least one admin");
      expect(consoleError).toHaveBeenCalled();
      expect(await membershipExists(adminId)).toBeTrue();
    } finally {
      consoleError.mockRestore();
    }
  });
});
