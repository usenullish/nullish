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

describe("check_invoice_deletable_only_if_draft", () => {
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

  test("allows deleting a draft invoice", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const deleted = await db.delete(invoices).where(eq(invoices.id, invoiceId)).returning();

    expect(deleted).toHaveLength(1);
  });

  test("rejects deleting a finalized invoice", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));

    const error = await db
      .delete(invoices)
      .where(eq(invoices.id, invoiceId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be deleted");
  });
});
