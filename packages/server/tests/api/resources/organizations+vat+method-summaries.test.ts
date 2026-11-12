import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import {
  DbSchema,
  type PostgresDbInstance,
  VatPaymentMethod,
  VatRemunerationMethod,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { VatMethodSummariesHandlers } from "../../../src/api/resources/_organizations+vat+method-summaries";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;

describe("organization VAT method summaries", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let outsiderCookie: string;
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

  const list = async ({
    cookie: sessionCookie,
    direction = "desc",
  }: {
    cookie?: string;
    direction?: "asc" | "desc";
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    VatMethodSummariesHandlers.create({ app }).register();

    return await app.request(
      `/organizations/${organizationId}/accounting/vat/method-summaries?limit=100&offset=0&sort=startOn&direction=${direction}`,
      { headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) } },
    );
  };

  const startYears = async (response: Response): Promise<number[]> =>
    ApiSchema.VatMethodSummaries.GetVatMethodSummariesResponseSchema.parse(
      await response.json(),
    ).vatMethodSummaries.map(({ period }) => period.startOn.getUTCFullYear());

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

    const user = await signUp({ email: "vat-method-summaries@test.local" });
    cookie = user.cookie;

    outsiderCookie = (await signUp({ email: "vat-method-summaries-outsider@test.local" })).cookie;

    organizationId = await createOrganization(db, user.id);

    await db.insert(vatSettings).values({ organizationId, vatNumber: "CHE-123.456.789 MWST" });

    const rows = await db
      .insert(periods)
      .values(
        [2025, 2023, 2024].map((year) => ({
          organizationId,
          startOn: new Date(`${year}-01-01`),
          endOn: new Date(`${year}-12-31`),
        })),
      )
      .returning();

    await db.insert(vatMethods).values(
      rows.map(({ id }) => ({
        organizationId,
        periodId: id,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.NET_RATE,
      })),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await list({});

    expect(response.status).toBe(401);
  });

  test("lists the VAT methods with their period, newest first", async () => {
    const response = await list({ cookie });

    expect(response.status).toBe(200);
    expect(await startYears(response)).toEqual([2025, 2024, 2023]);
  });

  test("lists the VAT methods with their period, oldest first", async () => {
    const response = await list({ cookie, direction: "asc" });

    expect(response.status).toBe(200);
    expect(await startYears(response)).toEqual([2023, 2024, 2025]);
  });

  test("lists no VAT method to a user outside the organization", async () => {
    const response = await list({ cookie: outsiderCookie });

    expect(response.status).toBe(200);
    expect(await startYears(response)).toEqual([]);
  });
});
