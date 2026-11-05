import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { OpenInvoiceService } from "@usenullish/nullish-engine/billing";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { BankMovementSummariesHandlers } from "../../../src/api/resources/_bank-relations+movement-summaries";
import {
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  randomDedupeHash,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;

describe("bank relation movement summaries", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let userId: string;
  let cookie: string;
  let organizationId: string;
  let clientId: string;
  let bankRelationId: string;
  let statementId: string;

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
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    const resource = BankMovementSummariesHandlers.create({ app });
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
        autoSignIn: true,
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);

    const user = await signUp({ email: "bank-movement-summaries@test.local" });
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
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  const list = ({ cookie: sessionCookie }: { cookie?: string }) =>
    request({
      path: `/banking/relations/${bankRelationId}/movement-summaries?limit=100&offset=0&sort=createdAt&direction=asc&status=unreconciled`,
      cookie: sessionCookie,
    });

  test("answers 401 without a session", async () => {
    const response = await list({});

    expect(response.status).toBe(401);
  });

  test("lists a movement without a reference with no suggested invoice", async () => {
    const movementId = await createMovement({});

    const response = await list({ cookie });

    expect(response.status).toBe(200);
    const { bankMovementSummaries } =
      ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema.parse(
        await response.json(),
      );
    expect(
      bankMovementSummaries.find(({ movement }) => movement.id === movementId)?.suggestedInvoice,
    ).toBeNull();
  });

  test("lists a movement with the open invoice its QR reference suggests", async () => {
    const { id: invoiceId, paymentReference } = await openInvoice();
    const movementId = await createMovement({ creditorReference: `000000${paymentReference}0` });

    const response = await list({ cookie });

    expect(response.status).toBe(200);
    const { bankMovementSummaries } =
      ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema.parse(
        await response.json(),
      );
    expect(
      bankMovementSummaries.find(({ movement }) => movement.id === movementId)?.suggestedInvoice
        ?.invoice.id,
    ).toBe(invoiceId);
  });
});
