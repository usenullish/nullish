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

const setNumber = (invoiceId: string, number: number | null) =>
  db.update(invoices).set({ number }).where(eq(invoices.id, invoiceId)).returning();

describe("assign_invoice_number", () => {
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

  test("leaves a draft without a number", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

    expect(row?.number).toBeNull();
  });

  test("keeps a draft without a number when it is updated", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [updated] = await db
      .update(invoices)
      .set({ dueOn: new Date("2026-02-01") })
      .where(eq(invoices.id, invoiceId))
      .returning();

    expect(updated?.number).toBeNull();
  });

  test("assigns 1 to the first opened invoice of a client", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [opened] = await setStatus(invoiceId, InvoiceStatus.OPEN);

    expect(opened?.number).toBe(1);
  });

  test("assigns the next number in the order invoices are opened", async () => {
    const firstCreatedId = await createDraftInvoice(db, organizationId, clientId);
    const secondCreatedId = await createDraftInvoice(db, organizationId, clientId);

    const [openedFirst] = await setStatus(secondCreatedId, InvoiceStatus.OPEN);
    const [openedSecond] = await setStatus(firstCreatedId, InvoiceStatus.OPEN);

    expect(openedFirst?.number).toBe(1);
    expect(openedSecond?.number).toBe(2);
  });

  test("leaves no gap when a draft is deleted", async () => {
    const firstId = await createDraftInvoice(db, organizationId, clientId);
    const deletedId = await createDraftInvoice(db, organizationId, clientId);
    const lastId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(firstId, InvoiceStatus.OPEN);
    await db.delete(invoices).where(eq(invoices.id, deletedId));

    const [opened] = await setStatus(lastId, InvoiceStatus.OPEN);

    expect(opened?.number).toBe(2);
  });

  test("numbers each client separately", async () => {
    const otherClientId = await createClient(db, organizationId);
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const otherInvoiceId = await createDraftInvoice(db, organizationId, otherClientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const [opened] = await setStatus(otherInvoiceId, InvoiceStatus.OPEN);

    expect(opened?.number).toBe(1);
  });

  test("ignores a number provided when opening", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [opened] = await db
      .update(invoices)
      .set({ status: InvoiceStatus.OPEN, number: 42 })
      .where(eq(invoices.id, invoiceId))
      .returning();

    expect(opened?.number).toBe(1);
  });

  test("keeps the number through the later status changes", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);
    await setStatus(invoiceId, InvoiceStatus.PAID);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const [voided] = await setStatus(invoiceId, InvoiceStatus.VOID);

    expect(voided?.number).toBe(1);
  });

  test("rejects setting a number on a draft", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const error = await setNumber(invoiceId, 7).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("number cannot be changed");
  });

  test("rejects changing the number once assigned", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const error = await setNumber(invoiceId, 7).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("number cannot be changed");
  });

  test("rejects clearing the number once assigned", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const error = await setNumber(invoiceId, null).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("number cannot be changed");
  });

  test("rejects a draft inserted with a number", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        number: 1,
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("invoices_number_unless_draft");
  });
});
