import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { BillingPeriod, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import { assertNonNullish, type Nullable, nonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { loadWorkersMiddleware } from "../../../src/api/middlewares/workers";
import { PaymentsPlansHandlers } from "../../../src/api/resources/_payments+plans";
import { resetDb } from "../../../../engine/tests/_test-utils";

const PLANS = [
  {
    productName: "10 users",
    prices: [
      {
        priceId: "price_monthly",
        amount: 2900n,
        currency: "CHF",
        billingPeriod: BillingPeriod.MONTH,
      },
      {
        priceId: "price_yearly",
        amount: 29000n,
        currency: "CHF",
        billingPeriod: BillingPeriod.YEAR,
      },
    ],
  },
];

describe("payments plans", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let user: { id: string; cookie: string };

  const handle = mock<ProcessPayments["handle"]>(async () => undefined);
  const checkout = mock<ProcessPayments["checkout"]>(async () => ({
    url: "https://checkout.stripe.com/c/pay/cs_1",
  }));
  const listPlans = mock<ProcessPayments["listPlans"]>(async () => PLANS);

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
    cookie,
    payments = { handle, checkout, listPlans },
  }: {
    cookie?: string;
    payments?: Nullable<ProcessPayments>;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use(
      "*",
      loadWorkersMiddleware({
        jobs: {} as TriggerJobs,
        storage: FsStorageProvider.create(),
        mail: null,
        payments,
      }),
    );
    app.use("*", loadCallerMiddleware());

    PaymentsPlansHandlers.create({ app }).register();

    return await app.request("/payments/plans", {
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
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

    user = await signUp({ email: "payments-plans-user@test.local" });
  });

  beforeEach(() => {
    listPlans.mockReset();
    listPlans.mockImplementation(async () => PLANS);
  });

  afterEach(() => {
    mock.restore();
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 503 when the payments are not enabled", async () => {
    const response = await get({ cookie: user.cookie, payments: null });

    expect(response.status).toBe(503);
  });

  test("answers 401 without a session", async () => {
    const response = await get({});

    expect(response.status).toBe(401);
    expect(listPlans).not.toHaveBeenCalled();
  });

  test("returns the plans with their prices", async () => {
    const response = await get({ cookie: user.cookie });

    expect(response.status).toBe(200);
    expect(
      ApiSchema.PaymentsPlans.GetPlansResponseSchema.parse(await response.json()).plans,
    ).toEqual(PLANS);
  });

  test("encodes the amounts as bigint", async () => {
    const response = await get({ cookie: user.cookie });

    expect(await response.text()).toContain('"amount":{"__bigint__":"2900"}');
  });

  test("answers 500 with a generic message when the plans cannot be listed", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    listPlans.mockImplementation(async () => {
      throw new Error("Stripe is down");
    });

    const response = await get({ cookie: user.cookie });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to list the plans",
      code: ErrorCode.UNEXPECTED,
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
