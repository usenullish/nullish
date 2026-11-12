import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { OpenInvoiceService } from "@usenullish/nullish-engine/billing";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  type PostgresDbInstance,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { BankMovementsReconcileHandlers } from "../../../src/api/resources/_bank-movements+reconcile";
import {
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  leafAccountId,
  randomDedupeHash,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;

describe("bank movements reconcile", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let userId: string;
  let cookie: string;
  let organizationId: string;
  let clientId: string;
  let bankRelationId: string;
  let statementId: string;
  let incomeAccountId: string;

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
    method = "GET",
    body,
    cookie: sessionCookie,
  }: {
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    const resource = BankMovementsReconcileHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    return await app.request(path, {
      method,
      headers: {
        ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }),
        ...(nonNullish(body) && { "Content-Type": "application/json" }),
      },
      ...(nonNullish(body) && { body: JSON.stringify(body) }),
    });
  };

  const createMovement = async ({
    amount = 1000n,
    creditorReference = null,
  }: {
    amount?: bigint;
    creditorReference?: string | null;
  }): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount,
        currency: "CHF",
        creditorReference,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const openInvoice = async (): Promise<{ id: string; paymentReference: string }> => {
    const id = await createDraftInvoice(db, { organizationId, clientId });
    await createLine(db, id, "Item line", { unitPrice: 1000n });

    const result = await OpenInvoiceService.create({ db, userId, invoiceId: id }).open();
    if (result.status !== "success") {
      throw new Error(`Failed to open invoice ${id} for test setup`);
    }

    const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
    assertNonNullish(row?.paymentReference);

    return { id, paymentReference: row.paymentReference };
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

    const user = await signUp({ email: "bank-movements-reconcile@test.local" });
    userId = user.id;
    cookie = user.cookie;

    organizationId = await createOrganization(db, userId);
    await db.insert(periods).values({
      organizationId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    clientId = await createClient(db, organizationId);
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
    incomeAccountId = await leafAccountId(db, organizationId, AccountType.INCOME);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  const reconcile = ({
    movementId,
    body,
    cookie: sessionCookie,
  }: {
    movementId: string;
    body: unknown;
    cookie?: string;
  }) =>
    request({
      path: `/banking/movements/${movementId}/reconcile`,
      method: "POST",
      body,
      cookie: sessionCookie,
    });

  test("answers 401 without a session", async () => {
    const movementId = await createMovement({});

    const response = await reconcile({
      movementId,
      body: { type: "account", accountId: incomeAccountId, description: null },
    });

    expect(response.status).toBe(401);
  });

  test("books a movement on an account", async () => {
    const movementId = await createMovement({});

    const response = await reconcile({
      movementId,
      body: { type: "account", accountId: incomeAccountId, description: "Capital contribution" },
      cookie,
    });

    expect(response.status).toBe(200);
    const { bankMovement } =
      ApiSchema.BankMovementsReconcile.ReconcileBankMovementResponseSchema.parse(
        await response.json(),
      );
    expect(bankMovement.id).toBe(movementId);
    expect(bankMovement.status).toBe(BankMovementStatus.RECONCILED);
  });

  test("pays an invoice with a movement", async () => {
    const { id: invoiceId } = await openInvoice();
    const movementId = await createMovement({});

    const response = await reconcile({
      movementId,
      body: { type: "invoice", invoiceId },
      cookie,
    });

    expect(response.status).toBe(200);
    const { bankMovement } =
      ApiSchema.BankMovementsReconcile.ReconcileBankMovementResponseSchema.parse(
        await response.json(),
      );
    expect(bankMovement.status).toBe(BankMovementStatus.RECONCILED);
  });

  test("answers 400 to a reconciliation without a type", async () => {
    const movementId = await createMovement({});

    const response = await reconcile({
      movementId,
      body: { accountId: incomeAccountId, description: null },
      cookie,
    });

    expect(response.status).toBe(400);
  });

  test("answers 422 with the reason to a movement already reconciled", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const movementId = await createMovement({});
      const body = { type: "account", accountId: incomeAccountId, description: null };
      await reconcile({ movementId, body, cookie });

      const response = await reconcile({ movementId, body, cookie });

      expect(response.status).toBe(422);
      const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
      expect(error.code).toBe(ErrorCode.REJECTED);
      expect(error.error).toContain("is reconciled and cannot be reconciled");
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
