import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
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

describe("check_invoice_status_transition", () => {
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

  test("allows draft -> open", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [updated] = await setStatus(invoiceId, InvoiceStatus.OPEN);

    expect(updated?.status).toBe(InvoiceStatus.OPEN);
  });

  test("rejects open -> draft", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);

    const error = await setStatus(invoiceId, InvoiceStatus.DRAFT).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("Invalid invoice status transition: open -> draft");
  });

  test("allows open -> paid -> open (reopen)", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);
    await setStatus(invoiceId, InvoiceStatus.PAID);

    const [reopened] = await setStatus(invoiceId, InvoiceStatus.OPEN);

    expect(reopened?.status).toBe(InvoiceStatus.OPEN);
  });

  test("allows open -> uncollectible -> paid", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);
    await setStatus(invoiceId, InvoiceStatus.UNCOLLECTIBLE);

    const [paid] = await setStatus(invoiceId, InvoiceStatus.PAID);

    expect(paid?.status).toBe(InvoiceStatus.PAID);
  });

  test("rejects any change once void", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await setStatus(invoiceId, InvoiceStatus.OPEN);
    await setStatus(invoiceId, InvoiceStatus.VOID);

    const error = await setStatus(invoiceId, InvoiceStatus.PAID).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is void and cannot be modified");
  });

  test("rejects draft -> paid directly", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const error = await setStatus(invoiceId, InvoiceStatus.PAID).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("Invalid invoice status transition: draft -> paid");
  });
});
