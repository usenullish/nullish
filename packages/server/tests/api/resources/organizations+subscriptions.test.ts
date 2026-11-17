import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { type PostgresDbInstance, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { SubscriptionsHandlers } from "../../../src/api/resources/_organizations+subscriptions";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const LIST_QUERY = "limit=100&offset=0&sort=createdAt&direction=asc";

describe("organization subscriptions", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let member: { id: string; cookie: string };
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

  const listSubscriptions = async ({ cookie }: { cookie?: string }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    SubscriptionsHandlers.create({ app }).register();

    return await app.request(`/organizations/${organizationId}/subscriptions?${LIST_QUERY}`, {
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
    });
  };

  const parseSubscriptions = async (response: Response) =>
    ApiSchema.Subscriptions.GetSubscriptionsResponseSchema.parse(await response.json())
      .subscriptions;

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

    member = await signUp({ email: "subscriptions-member@test.local" });
    outsider = await signUp({ email: "subscriptions-outsider@test.local" });

    organizationId = await createOrganization(db, member.id);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await listSubscriptions({});

    expect(response.status).toBe(401);
  });

  test("returns the subscription of the organization to a member", async () => {
    const response = await listSubscriptions({ cookie: member.cookie });

    expect(response.status).toBe(200);

    const subscriptions = await parseSubscriptions(response);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.organizationId).toBe(organizationId);
    expect(subscriptions[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(subscriptions[0]?.periodEnd).toBeNull();
  });

  test("returns nothing to a user outside the organization", async () => {
    const response = await listSubscriptions({ cookie: outsider.cookie });

    expect(response.status).toBe(200);
    expect(await parseSubscriptions(response)).toEqual([]);
  });
});
