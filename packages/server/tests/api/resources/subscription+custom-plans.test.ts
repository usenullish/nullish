import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { inArray } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import {
  BillingPeriod,
  DbSchema,
  type PostgresDbInstance,
  SubscriptionProvider,
} from "@usenullish/nullish-schema/db";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { loadWorkersMiddleware } from "../../../src/api/middlewares/workers";
import { CustomPlansHandlers } from "../../../src/api/resources/_subscription+custom-plans";
import { resetDb } from "../../../../engine/tests/_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

describe("subscription custom plans", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let user: { id: string; cookie: string };
  let planId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const get = async ({ cookie }: { cookie?: string }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use(
      "*",
      loadWorkersMiddleware({
        jobs: {} as TriggerJobs,
        storage: FsStorageProvider.create(),
        mail: null,
        payments: null,
      }),
    );
    app.use("*", loadCallerMiddleware());

    CustomPlansHandlers.create({ app }).register();

    return await app.request("/subscription/custom-plans", {
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

    user = await signUp({ email: "custom-plans-user@test.local" });

    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.CUSTOM })
      .returning();
    assertNonNullish(plan);
    planId = plan.id;

    const [product] = await db
      .insert(customProducts)
      .values({
        planId,
        provider: SubscriptionProvider.CUSTOM,
        name: "Instance",
        contactUrl: "https://example.com/contact",
      })
      .returning();
    assertNonNullish(product);

    await db.insert(customPrices).values({
      productId: product.id,
      amount: 24000n,
      currency: "CHF",
      billingPeriod: BillingPeriod.MONTH,
    });
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [planId]));
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await get({});

    expect(response.status).toBe(401);
  });

  test("returns the custom plans with their product and prices without the payments", async () => {
    const response = await get({ cookie: user.cookie });

    expect(response.status).toBe(200);

    const { customPlans } = ApiSchema.CustomPlans.GetCustomPlansResponseSchema.parse(
      await response.json(),
    );
    const customPlan = customPlans.find(({ plan }) => plan.id === planId);

    expect(customPlan?.product.name).toBe("Instance");
    expect(customPlan?.product.contactUrl).toBe("https://example.com/contact");
    expect(customPlan?.prices.map(({ amount, billingPeriod }) => [amount, billingPeriod])).toEqual([
      [24000n, BillingPeriod.MONTH],
    ]);
  });

  test("encodes the amounts as bigint", async () => {
    const response = await get({ cookie: user.cookie });

    expect(await response.text()).toContain('"amount":{"__bigint__":"24000"}');
  });
});
