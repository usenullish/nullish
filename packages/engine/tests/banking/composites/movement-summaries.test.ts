import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BankMovementStatus, InvoiceStatus, DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionMovementSummaries } from "../../../src/banking/composites/movement-summaries";
import { OpenInvoiceService } from "../../../src/billing/services/invoices/invoice.open";
import type { InvoiceServiceArgs } from "../../../src/billing/services/invoices/_invoice";
import {
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  randomDedupeHash,
  resetDb,
  seedUsers,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("DbCollectionMovementSummaries", () => {
  let orgId: string;
  let clientId: string;
  let bankRelationId: string;
  let statementId: string;

  let invoiceId: string;
  let paymentReference: string;

  const openInvoice = async (): Promise<{ id: string; paymentReference: string }> => {
    const id = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, id, "Item line", { unitPrice: 1000n });

    const result = await OpenInvoiceService.create({
      db: db as unknown as InvoiceServiceArgs["db"],
      userId: TEST_USER_ID,
      invoiceId: id as InvoiceServiceArgs["invoiceId"],
    }).open();
    if (result.status !== "success") {
      throw new Error(`Failed to open invoice ${id} for test setup`);
    }

    const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
    assertNonNullish(row?.paymentReference);

    return { id, paymentReference: row.paymentReference };
  };

  const createMovement = async ({
    amount = 1000n,
    creditorReference = null,
    status = BankMovementStatus.UNRECONCILED,
  }: {
    amount?: bigint;
    creditorReference?: string | null;
    status?: BankMovementStatus;
  }): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId: orgId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount,
        currency: "CHF",
        creditorReference,
        status,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const qrReference = (reference: string): string => `000000${reference}0`;

  const list = (filters?: { status?: BankMovementStatus }) =>
    DbCollectionMovementSummaries.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: bankRelationId,
    }).list({
      pagination: { limit: 50, offset: 0 },
      sort: { field: "createdAt", direction: "asc" },
      filters,
    });

  const listSuggestedInvoiceIds = async (filters?: {
    status?: BankMovementStatus;
  }): Promise<Map<string, string | null>> => {
    const result = await list(filters);

    expect(result.status).toBe("success");
    if (result.status !== "success") return new Map();

    return new Map(
      result.result.map(({ movement, suggestedInvoice }) => [
        movement.id,
        suggestedInvoice?.invoice.id ?? null,
      ]),
    );
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    clientId = await createClient(db, orgId);

    bankRelationId = await createBankRelation(db, orgId);
    statementId = await createBankStatement(db, { organizationId: orgId, bankRelationId });

    ({ id: invoiceId, paymentReference } = await openInvoice());
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("suggests the open invoice of the QR reference of money in", async () => {
    const movementId = await createMovement({ creditorReference: qrReference(paymentReference) });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBe(invoiceId);
  });

  test("suggests the open invoice of the creditor reference of money in", async () => {
    const movementId = await createMovement({ creditorReference: `RF00${paymentReference}` });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBe(invoiceId);
  });

  test("returns the amounts of the suggested invoice", async () => {
    const movementId = await createMovement({ creditorReference: qrReference(paymentReference) });

    const result = await list();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const summary = result.result.find(({ movement }) => movement.id === movementId);
    expect(summary?.suggestedInvoice?.amounts.balance.remaining).toBe(1000n);
  });

  test("suggests no invoice for money in without a reference", async () => {
    const movementId = await createMovement({});

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBeNull();
  });

  test("suggests no invoice for money out", async () => {
    const movementId = await createMovement({
      amount: -1000n,
      creditorReference: qrReference(paymentReference),
    });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBeNull();
  });

  test("suggests no invoice for an ignored movement", async () => {
    const movementId = await createMovement({
      creditorReference: qrReference(paymentReference),
      status: BankMovementStatus.IGNORED,
    });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBeNull();
  });

  test("suggests the paid invoice of the QR reference of money in", async () => {
    const paid = await openInvoice();
    await db.update(invoices).set({ status: InvoiceStatus.PAID }).where(eq(invoices.id, paid.id));
    const movementId = await createMovement({
      creditorReference: qrReference(paid.paymentReference),
    });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBe(paid.id);
  });

  test("suggests no invoice for a voided invoice", async () => {
    const voided = await openInvoice();
    await db.update(invoices).set({ status: InvoiceStatus.VOID }).where(eq(invoices.id, voided.id));
    const movementId = await createMovement({
      creditorReference: qrReference(voided.paymentReference),
    });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBeNull();
  });

  test("suggests no invoice for a reference of no invoice", async () => {
    const movementId = await createMovement({
      creditorReference: qrReference("00000000000000000000"),
    });

    const suggestions = await listSuggestedInvoiceIds();

    expect(suggestions.get(movementId)).toBeNull();
  });

  test("lists only the movements matching the filters", async () => {
    const ignoredId = await createMovement({ status: BankMovementStatus.IGNORED });

    const result = await list({ status: BankMovementStatus.IGNORED });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.map(({ movement }) => movement.id)).toContain(ignoredId);
    expect(
      result.result.every(({ movement }) => movement.status === BankMovementStatus.IGNORED),
    ).toBeTrue();
  });
});
