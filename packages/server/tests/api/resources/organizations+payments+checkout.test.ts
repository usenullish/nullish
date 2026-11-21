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
import { PaymentsCheckoutHandlers } from "../../../src/api/resources/_organizations+payments+checkout";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";

const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_1";
const PRICE_ID = "price_123";

describe("organization payments checkout", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let admin: { id: string; cookie: string };
  let organizationId: string;

  const handle = mock<ProcessPayments["handle"]>(async () => undefined);
  const checkout = mock<ProcessPayments["checkout"]>(async () => ({ url: CHECKOUT_URL }));
  const listPlans = mock<ProcessPayments["listPlans"]>(async () => []);
  const manage = mock<ProcessPayments["manage"]>(async () => ({
    url: "https://billing.stripe.com/p/session/bps_1",
  }));

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
    parentId = organizationId,
    payments = { handle, checkout, manage, listPlans },
  }: {
    cookie?: string;
    parentId?: string;
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

    PaymentsCheckoutHandlers.create({ app }).register();

    return await app.request(`/organizations/${parentId}/payments/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(nonNullish(cookie) && { Cookie: cookie }),
      },
      body: JSON.stringify({ priceId: PRICE_ID, billingPeriod: BillingPeriod.MONTH }),
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

    admin = await signUp({ email: "payments-checkout-admin@test.local" });

    organizationId = await createOrganization(db, admin.id);
  });

  beforeEach(() => {
    checkout.mockReset();
    checkout.mockImplementation(async () => ({ url: CHECKOUT_URL }));
  });

  afterEach(() => {
    mock.restore();
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 503 when the payments are not enabled", async () => {
    const response = await post({ cookie: admin.cookie, payments: null });

    expect(response.status).toBe(503);
  });

  test("answers 401 without a session", async () => {
    const response = await post({});

    expect(response.status).toBe(401);
    expect(checkout).not.toHaveBeenCalled();
  });

  test("answers 400 for an invalid organization id", async () => {
    const response = await post({ cookie: admin.cookie, parentId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(checkout).not.toHaveBeenCalled();
  });

  test("returns the checkout url", async () => {
    const response = await post({ cookie: admin.cookie });

    expect(response.status).toBe(200);
    expect(
      ApiSchema.PaymentsCheckout.CheckoutPaymentsResponseSchema.parse(await response.json()),
    ).toEqual({ url: CHECKOUT_URL });
  });

  test("checks out with the user, the organization, the price and the billing period", async () => {
    await post({ cookie: admin.cookie });

    expect(checkout).toHaveBeenCalledWith({
      userId: admin.id,
      organizationId,
      priceId: PRICE_ID,
      billingPeriod: BillingPeriod.MONTH,
    });
  });

  test("answers 500 with a generic message when the checkout fails", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    checkout.mockImplementation(async () => {
      throw new Error("Not an admin");
    });

    const response = await post({ cookie: admin.cookie });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to start the checkout",
      code: ErrorCode.UNEXPECTED,
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
