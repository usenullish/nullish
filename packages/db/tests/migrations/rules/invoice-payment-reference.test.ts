import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { EXCHANGE_RATE_ONE, InvoiceStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createOrganization,
  invoices,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const setStatus = (invoiceId: string, status: InvoiceStatus) =>
  db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId)).returning();

const setPaymentReference = (invoiceId: string, paymentReference: string | null) =>
  db.update(invoices).set({ paymentReference }).where(eq(invoices.id, invoiceId)).returning();

describe("assign_invoice_payment_reference", () => {
  let organizationId: string;
  let clientId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    clientId = await createClient(db, organizationId);
  });

  test("leaves a draft without a payment reference", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

    expect(row?.paymentReference).toBeNull();
  });

  test("assigns a payment reference of 20 digits when the invoice is opened", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [opened] = await setStatus(invoiceId, InvoiceStatus.OPEN);

    expect(opened?.paymentReference).toMatch(/^[0-9]{20}$/);
  });

  test("assigns a different payment reference to each opened invoice", async () => {
    const firstId = await createDraftInvoice(db, organizationId, clientId);
    const secondId = await createDraftInvoice(db, organizationId, clientId);

    const [first] = await setStatus(firstId, InvoiceStatus.OPEN);
    const [second] = await setStatus(secondId, InvoiceStatus.OPEN);

    expect(first?.paymentReference).not.toBe(second?.paymentReference);
  });

  test("ignores a payment reference provided when opening", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [opened] = await db
      .update(invoices)
      .set({ status: InvoiceStatus.OPEN, paymentReference: "00000000000000000042" })
      .where(eq(invoices.id, invoiceId))
      .returning();

    expect(opened?.paymentReference).toMatch(/^[0-9]{20}$/);
    expect(opened?.paymentReference).not.toBe("00000000000000000042");
  });

  test("keeps the payment reference through the later status changes", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const [opened] = await setStatus(invoiceId, InvoiceStatus.OPEN);
    await setStatus(invoiceId, InvoiceStatus.PAID);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const [voided] = await setStatus(invoiceId, InvoiceStatus.VOID);

    expect(voided?.paymentReference).toBe(opened?.paymentReference ?? "");
  });

  test("rejects setting a payment reference on a draft", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const error = await setPaymentReference(invoiceId, "00000000000000000007").catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("payment_reference cannot be changed");
  });

  test("rejects changing the payment reference once assigned", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const error = await setPaymentReference(invoiceId, "00000000000000000007").catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("payment_reference cannot be changed");
  });

  test("rejects clearing the payment reference once assigned", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const error = await setPaymentReference(invoiceId, null).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("payment_reference cannot be changed");
  });

  test("rejects a draft inserted with a payment reference", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        paymentReference: "00000000000000000001",
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("invoices_payment_reference_unless_draft");
  });
});
