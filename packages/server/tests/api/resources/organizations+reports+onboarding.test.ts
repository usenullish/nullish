import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { OrganizationsReportsOnboarding } from "../../../src/api/resources/_organizations+reports+onboarding";
import {
  createBankRelation,
  createClient,
  createDraftInvoice,
  createOrganization,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

describe("organization onboarding report", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let outsiderCookie: string;
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

  const get = async ({
    organizationId,
    cookie: sessionCookie,
  }: {
    organizationId: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    OrganizationsReportsOnboarding.create({ app }).register();

    return await app.request(`/organizations/${organizationId}/reports/onboarding`, {
      headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) },
    });
  };

  const parse = async (response: Response) =>
    ApiSchema.Onboarding.GetOnboardingResponseSchema.parse(await response.json());

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

    const user = await signUp({ email: "onboarding@test.local" });
    cookie = user.cookie;
    userId = user.id;

    outsiderCookie = (await signUp({ email: "onboarding-outsider@test.local" })).cookie;
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const organizationId = await createOrganization(db, userId);

    const response = await get({ organizationId });

    expect(response.status).toBe(401);
  });

  test("answers 400 for an invalid organization id", async () => {
    const response = await get({ organizationId: "not-a-uuid", cookie });

    expect(response.status).toBe(400);
  });

  test("has nothing for a new organization", async () => {
    const organizationId = await createOrganization(db, userId);

    const response = await get({ organizationId, cookie });

    expect(response.status).toBe(200);
    expect(await parse(response)).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });

  test("has everything once a client, an invoice and a bank account exist", async () => {
    const organizationId = await createOrganization(db, userId);
    const clientId = await createClient(db, organizationId);
    await createDraftInvoice(db, { organizationId, clientId });
    await createBankRelation(db, organizationId);

    const response = await get({ organizationId, cookie });

    expect(response.status).toBe(200);
    expect(await parse(response)).toEqual({
      hasClients: true,
      hasInvoices: true,
      hasBankRelations: true,
    });
  });

  test("has nothing for a user outside the organization", async () => {
    const organizationId = await createOrganization(db, userId);
    await createClient(db, organizationId);

    const response = await get({ organizationId, cookie: outsiderCookie });

    expect(response.status).toBe(200);
    expect(await parse(response)).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });
});
