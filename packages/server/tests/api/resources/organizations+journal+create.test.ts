import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import {
  DbSchema,
  type PostgresDbInstance,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { JournalCreateHandlers } from "../../../src/api/resources/_organizations+journal+create";
import { createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const postingManualVatPostings =
  DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;

describe("journal create", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let organizationId: string;
  let expenseId: string;
  let bankId: string;
  let taxPreMaterialId: string;
  let vatRateId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const request = async ({
    path,
    body,
    cookie: sessionCookie,
  }: {
    path: string;
    body: unknown;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    const resource = JournalCreateHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    return await app.request(path, {
      method: "POST",
      headers: {
        ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  const systemAccountId = async (purpose: SystemAccountPurpose): Promise<string> => {
    const [row] = await db
      .select()
      .from(systemAccounts)
      .where(
        and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
      );
    assertNonNullish(row);
    return row.accountId;
  };

  const purchase = ({ credit = 10810n }: { credit?: bigint } = {}) => ({
    entry: { validOn: { __date__: "2026-06-15" }, reference: "PURCHASE" },
    postings: [
      {
        accountId: expenseId,
        description: "Purchase",
        currency: "CHF",
        vatRateId,
        debit: { __bigint__: "10810" },
        credit: { __bigint__: "0" },
      },
      {
        accountId: bankId,
        description: "Purchase",
        currency: "CHF",
        debit: { __bigint__: "0" },
        credit: { __bigint__: `${credit}` },
      },
    ],
  });

  const vatPostingIdsOf = async (journalEntryId: string): Promise<string[]> =>
    (
      await db
        .select({ vatPostingId: postingManualVatPostings.vatPostingId })
        .from(postingManualVatPostings)
        .innerJoin(postings, eq(postings.id, postingManualVatPostings.postingId))
        .where(eq(postings.journalEntryId, journalEntryId))
    ).map(({ vatPostingId }) => vatPostingId);

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

    const user = await signUp({ email: "journal-create@test.local" });
    cookie = user.cookie;

    organizationId = await createOrganization(db, user.id);

    const [period] = await db
      .insert(periods)
      .values({
        organizationId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      })
      .returning();
    assertNonNullish(period);

    await db.insert(vatSettings).values({
      organizationId,
      vatNumber: "CHE-123.456.789 MWST",
    });

    await db.insert(vatMethods).values({
      organizationId,
      periodId: period.id,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const [rate] = await db
      .select()
      .from(vatRates)
      .where(and(eq(vatRates.organizationId, organizationId), eq(vatRates.code, "VM81")));
    assertNonNullish(rate);
    vatRateId = rate.id;

    expenseId = await systemAccountId(SystemAccountPurpose.DEFAULT_EXPENSE);
    bankId = await systemAccountId(SystemAccountPurpose.BANK_ACCOUNT);
    taxPreMaterialId = await systemAccountId(SystemAccountPurpose.TAX_PRE_MATERIAL);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await request({
      path: `/organizations/${organizationId}/accounting/journal`,
      body: purchase(),
    });

    expect(response.status).toBe(401);
  });

  test("answers 400 for an invalid organization id", async () => {
    const response = await request({
      path: "/organizations/not-a-uuid/accounting/journal",
      body: purchase(),
      cookie,
    });

    expect(response.status).toBe(400);
  });

  test("creates the entry with the VAT postings of its input tax posting", async () => {
    const response = await request({
      path: `/organizations/${organizationId}/accounting/journal`,
      body: purchase(),
      cookie,
    });

    expect(response.status).toBe(201);

    const { journalEntry } = ApiSchema.Journal.CreateJournalEntryResponseSchema.parse(
      await response.json(),
    );

    const vatPostingIds = await vatPostingIdsOf(journalEntry.entry.id);
    const generated = journalEntry.postings.filter(({ id }) => vatPostingIds.includes(id));

    expect(journalEntry.postings).toHaveLength(4);
    expect(generated.map(({ accountId, debit, credit }) => ({ accountId, debit, credit }))).toEqual(
      [
        { accountId: taxPreMaterialId, debit: 810n, credit: 0n },
        { accountId: expenseId, debit: 0n, credit: 810n },
      ],
    );
  });

  test("creates an entry without VAT rate with no VAT postings", async () => {
    const body = purchase();

    const response = await request({
      path: `/organizations/${organizationId}/accounting/journal`,
      body: {
        ...body,
        postings: body.postings.map(({ vatRateId: _, ...posting }) => posting),
      },
      cookie,
    });

    expect(response.status).toBe(201);

    const { journalEntry } = ApiSchema.Journal.CreateJournalEntryResponseSchema.parse(
      await response.json(),
    );

    expect(journalEntry.postings).toHaveLength(2);
    expect(await vatPostingIdsOf(journalEntry.entry.id)).toEqual([]);
  });

  test("answers 422 with the reason for an entry which does not balance", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request({
        path: `/organizations/${organizationId}/accounting/journal`,
        body: purchase({ credit: 10000n }),
        cookie,
      });

      expect(response.status).toBe(422);
      const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
      expect(error.code).toBe(ErrorCode.REJECTED);
      expect(error.error).toContain("does not balance");
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
