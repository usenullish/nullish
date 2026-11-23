import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import {
  DbSchema,
  OrganizationSubscriptionStatus,
  type PostgresDbInstance,
  SubscriptionProvider,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { SubscriptionSummariesHandlers } from "../../../src/api/resources/_organizations+subscription-summaries";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const LIST_QUERY = "limit=100&offset=0&sort=createdAt&direction=asc";

describe("organization subscription summaries", () => {
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

  const listSummaries = async ({ cookie }: { cookie?: string }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    SubscriptionSummariesHandlers.create({ app }).register();

    return await app.request(
      `/organizations/${organizationId}/subscription-summaries?${LIST_QUERY}`,
      {
        headers: {
          ...(nonNullish(cookie) && { Cookie: cookie }),
        },
      },
    );
  };

  const parseSummaries = async (response: Response) =>
    ApiSchema.SubscriptionSummaries.GetSubscriptionSummariesResponseSchema.parse(
      await response.json(),
    ).subscriptionSummaries;

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

    member = await signUp({ email: "subscription-summaries-member@test.local" });
    outsider = await signUp({ email: "subscription-summaries-outsider@test.local" });

    organizationId = await createOrganization(db, member.id);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await listSummaries({});

    expect(response.status).toBe(401);
  });

  test("returns the subscription and an open organization to a member", async () => {
    const response = await listSummaries({ cookie: member.cookie });

    expect(response.status).toBe(200);

    const summaries = await parseSummaries(response);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.subscription.organizationId).toBe(organizationId);
    expect(summaries[0]?.organization).toEqual({
      status: OrganizationSubscriptionStatus.OPEN,
      expiresAt: null,
    });
  });

  test("returns the self plan of the subscription without product", async () => {
    const response = await listSummaries({ cookie: member.cookie });

    const summaries = await parseSummaries(response);

    expect(summaries[0]?.plan).toEqual({ provider: SubscriptionProvider.SELF, rules: null });
    expect(summaries[0]?.product).toBeNull();
  });

  test("returns nothing to a user outside the organization", async () => {
    const response = await listSummaries({ cookie: outsider.cookie });

    expect(response.status).toBe(200);
    expect(await parseSummaries(response)).toEqual([]);
  });

  test("returns a locked organization with an inactive subscription", async () => {
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));

    const response = await listSummaries({ cookie: member.cookie });

    expect(response.status).toBe(200);

    const summaries = await parseSummaries(response);

    expect(summaries[0]?.subscription.status).toBe(SubscriptionStatus.INACTIVE);
    expect(summaries[0]?.organization).toEqual({
      status: OrganizationSubscriptionStatus.LOCKED,
    });
  });
});
