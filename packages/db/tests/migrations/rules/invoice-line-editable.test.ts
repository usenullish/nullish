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
  createLine,
  createOrganization,
  lines,
  invoices,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_invoice_line_editable", () => {
  let organizationId: string;
  let clientId: string;
  let invoiceId: string;

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
    invoiceId = await createDraftInvoice(db, organizationId, clientId);
  });

  test("allows inserting a line while the invoice is a draft", async () => {
    const lineId = await createLine(db, invoiceId);

    expect(lineId).toBeDefined();
  });

  test("allows updating a line while the invoice is a draft", async () => {
    const lineId = await createLine(db, invoiceId);

    const [updated] = await db
      .update(lines)
      .set({ description: "Updated" })
      .where(eq(lines.id, lineId))
      .returning();

    expect(updated?.description).toBe("Updated");
  });

  test("rejects inserting a line once the invoice is no longer a draft", async () => {
    await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));

    const error = await createLine(db, invoiceId).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects updating a line once the invoice is no longer a draft", async () => {
    const lineId = await createLine(db, invoiceId);
    await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));

    const error = await db
      .update(lines)
      .set({ description: "Should fail" })
      .where(eq(lines.id, lineId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects deleting a line once the invoice is no longer a draft", async () => {
    const lineId = await createLine(db, invoiceId);
    await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));

    const error = await db
      .delete(lines)
      .where(eq(lines.id, lineId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });
});
