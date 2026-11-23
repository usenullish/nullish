import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { LegalForm, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { PaymentCancelStatus, type ProcessPayments } from "@usenullish/nullish-schema/payments";
import { assertNonNullish, type Nullable, nonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { loadWorkersMiddleware } from "../../../src/api/middlewares/workers";
import { OrganizationsHandlers } from "../../../src/api/resources/_organizations";
import { resetDb } from "../../../../engine/tests/_test-utils";

describe("organizations", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let admin: { id: string; cookie: string };

  const trigger = mock<TriggerJobs["trigger"]>(async () => ({ jobId: crypto.randomUUID() }));

  const jobs = { trigger } as unknown as TriggerJobs;

  const payments: ProcessPayments = {
    handle: mock<ProcessPayments["handle"]>(async () => undefined),
    checkout: mock<ProcessPayments["checkout"]>(async () => ({
      url: "https://checkout.stripe.com/c/pay/cs_1",
    })),
    manage: mock<ProcessPayments["manage"]>(async () => ({
      url: "https://billing.stripe.com/p/session/bps_1",
    })),
    cancel: mock<ProcessPayments["cancel"]>(async () => ({
      status: PaymentCancelStatus.NOT_SUBSCRIBED,
    })),
    listPlans: mock<ProcessPayments["listPlans"]>(async () => []),
  };

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const post = async ({
    cookie,
    withPayments = false,
  }: {
    cookie?: string;
    withPayments?: boolean;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use(
      "*",
      loadWorkersMiddleware({
        jobs,
        storage: FsStorageProvider.create(),
        mail: null,
        payments: withPayments ? payments : (null as Nullable<ProcessPayments>),
      }),
    );
    app.use("*", loadCallerMiddleware());

    OrganizationsHandlers.create({ app }).register();

    return await app.request("/organizations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
      body: JSON.stringify({ name: "Created Org", legalForm: LegalForm.LLC }),
    });
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

    admin = await signUp({ email: "organizations-admin@test.local" });
  });

  afterEach(() => {
    trigger.mockClear();
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("creates the organization and answers 201", async () => {
    const response = await post({ cookie: admin.cookie });

    expect(response.status).toBe(201);

    const { organization } = ApiSchema.Organizations.CreateOrganizationResponseSchema.parse(
      await response.json(),
    );

    expect(organization.name).toBe("Created Org");
  });

  test("schedules no reminder without payments", async () => {
    const response = await post({ cookie: admin.cookie });

    expect(response.status).toBe(201);
    expect(trigger).not.toHaveBeenCalled();
  });

  test("schedules no reminder without a trial", async () => {
    const response = await post({ cookie: admin.cookie, withPayments: true });

    expect(response.status).toBe(201);
    expect(trigger).not.toHaveBeenCalled();
  });

  test("answers 401 without a session", async () => {
    const response = await post({});

    expect(response.status).toBe(401);
    expect(trigger).not.toHaveBeenCalled();
  });
});
