import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { and, eq } from "drizzle-orm";
import { CreateInvitationService } from "@usenullish/nullish-engine/core";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { InvitationsAcceptHandlers } from "../../../src/api/resources/_invitations+accept";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const INVITEE_EMAIL = "accept-invitee@test.local";

describe("accept invitation", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let admin: { id: string; cookie: string };
  let invitee: { id: string; cookie: string };

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const accept = async ({ cookie, token }: { cookie?: string; token: string }) => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    InvitationsAcceptHandlers.create({ app }).register();

    return await app.request("/invitations/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
      body: JSON.stringify({ token }),
    });
  };

  const invite = async ({
    organizationId,
    email = INVITEE_EMAIL,
  }: {
    organizationId: string;
    email?: string;
  }): Promise<string> => {
    const result = await CreateInvitationService.create({
      db,
      userId: admin.id,
      organizationId,
      values: { email, role: "reviewer" },
    }).create();

    if (result.status === "error") {
      throw result.err;
    }

    return result.result.token;
  };

  const expectRejected = async ({
    response,
    message,
  }: {
    response: Response;
    message: string;
  }): Promise<void> => {
    expect(response.status).toBe(422);
    const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
    expect(error.code).toBe(ErrorCode.REJECTED);
    expect(error.error).toBe(message);
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
        signIn: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);

    admin = await signUp({ email: "accept-admin@test.local" });
    invitee = await signUp({ email: INVITEE_EMAIL });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await accept({ token: "any" });

    expect(response.status).toBe(401);
  });

  test("adds the invited person and returns the membership", async () => {
    const organizationId = await createOrganization(db, admin.id);
    const token = await invite({ organizationId });

    const response = await accept({ cookie: invitee.cookie, token });

    expect(response.status).toBe(200);

    const { membership } = ApiSchema.InvitationsAccept.AcceptInvitationResponseSchema.parse(
      await response.json(),
    );

    expect(membership.organizationId).toBe(organizationId);
    expect(membership.role).toBe("reviewer");

    const [row] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.organizationId, organizationId), eq(memberships.userId, invitee.id)),
      );

    expect(row?.id).toBe(membership.id);
  });

  test("answers 400 without a token", async () => {
    const response = await accept({ cookie: invitee.cookie, token: "" });

    expect(response.status).toBe(400);
  });

  describe("rejections", () => {
    test("answers 422 to an unknown token", async () => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      try {
        const response = await accept({ cookie: invitee.cookie, token: "unknown" });

        await expectRejected({ response, message: "This invitation is invalid or has expired" });
        expect(consoleError).toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });

    test("answers 422 to an invitation sent to another email", async () => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      try {
        const organizationId = await createOrganization(db, admin.id);
        const token = await invite({ organizationId, email: "someone@test.local" });

        const response = await accept({ cookie: invitee.cookie, token });

        await expectRejected({
          response,
          message: "This invitation was sent to another email address",
        });
        expect(consoleError).toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });

    test("answers 422 to a person who is already a member", async () => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      try {
        const organizationId = await createOrganization(db, admin.id);
        const token = await invite({ organizationId });
        await accept({ cookie: invitee.cookie, token });
        const secondToken = await invite({ organizationId });

        const response = await accept({ cookie: invitee.cookie, token: secondToken });

        await expectRejected({
          response,
          message: "You are already a member of this organization",
        });
        expect(consoleError).toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });
});
