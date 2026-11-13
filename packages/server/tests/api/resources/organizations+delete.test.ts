import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import type { Mock } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { OrganizationsDeleteHandlers } from "../../../src/api/resources/_organizations+delete";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAppUrl } from "@usenullish/nullish-env";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;

describe("delete organization", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let consoleError: Mock<typeof console.error>;

  let admin: { id: string; cookie: string };
  let accountant: { id: string; cookie: string };

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const deleteOrganization = async ({
    organizationId,
    cookie,
  }: {
    organizationId: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    OrganizationsDeleteHandlers.create({ app }).register();

    return await app.request(`/organizations/${organizationId}/delete`, {
      method: "POST",
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
    });
  };

  const deletedAtOf = async (organizationId: string): Promise<Date | null | undefined> => {
    const [row] = await db
      .select({ deletedAt: organizations.deletedAt })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    return row?.deletedAt;
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
        baseURL: envAppUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);

    admin = await signUp({ email: "delete-organization-admin@test.local" });
    accountant = await signUp({ email: "delete-organization-accountant@test.local" });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  beforeEach(() => {
    consoleError = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const expectError = async ({
    response,
    status,
    code,
  }: {
    response: Response;
    status: number;
    code: ErrorCode;
  }): Promise<string> => {
    expect(response.status).toBe(status);
    const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
    expect(error.code).toBe(code);
    expect(consoleError).toHaveBeenCalled();
    return error.error;
  };

  test("answers 401 without a session", async () => {
    const response = await deleteOrganization({ organizationId: crypto.randomUUID() });

    expect(response.status).toBe(401);
  });

  test("answers 400 to an id that is not a uuid", async () => {
    const response = await deleteOrganization({
      organizationId: "not-a-uuid",
      cookie: admin.cookie,
    });

    expect(response.status).toBe(400);
  });

  test("marks the organization of the admin as deleted and returns it", async () => {
    const organizationId = await createOrganization(db, admin.id);

    const response = await deleteOrganization({ organizationId, cookie: admin.cookie });

    expect(response.status).toBe(200);

    const { organization } = ApiSchema.OrganizationsDelete.DeleteOrganizationResponseSchema.parse(
      await response.json(),
    );

    expect(organization.id).toBe(organizationId);
    expect(organization.deletedAt).toBeInstanceOf(Date);
    expect(await deletedAtOf(organizationId)).toBeInstanceOf(Date);
  });

  test("answers 422 with the reason to an organization already marked as deleted", async () => {
    const organizationId = await createOrganization(db, admin.id);
    await deleteOrganization({ organizationId, cookie: admin.cookie });

    const response = await deleteOrganization({ organizationId, cookie: admin.cookie });

    const error = await expectError({ response, status: 422, code: ErrorCode.REJECTED });
    expect(error).toContain("is already marked as deleted");
  });

  test("answers 500 to a member who is not an admin", async () => {
    const organizationId = await createOrganization(db, admin.id);
    await db
      .insert(memberships)
      .values({ organizationId, userId: accountant.id, role: "accountant" });

    const response = await deleteOrganization({ organizationId, cookie: accountant.cookie });

    await expectError({ response, status: 500, code: ErrorCode.UNEXPECTED });
    expect(await deletedAtOf(organizationId)).toBeNull();
  });

  test("answers 500 to an unknown organization", async () => {
    const response = await deleteOrganization({
      organizationId: crypto.randomUUID(),
      cookie: admin.cookie,
    });

    await expectError({ response, status: 500, code: ErrorCode.UNEXPECTED });
  });
});
