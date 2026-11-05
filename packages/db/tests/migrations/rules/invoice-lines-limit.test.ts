import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { InvoiceLineType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  lines,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIMIT = 1000;

const insertLines = ({ invoiceId, count }: { invoiceId: string; count: number }) =>
  db.insert(lines).values(
    Array.from({ length: count }, (_, i) => ({
      organizationId: sql`(SELECT organization_id FROM billing.invoices WHERE id = ${invoiceId})`,
      invoiceId,
      type: InvoiceLineType.ITEM,
      description: `Line ${i}`,
      quantity: 1,
      unitPrice: 100n,
    })),
  );

const countLines = async (invoiceId: string): Promise<number> =>
  (await db.select({ id: lines.id }).from(lines).where(eq(lines.invoiceId, invoiceId))).length;

describe("check_invoice_lines_limit", () => {
  let organizationId: string;
  let clientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    clientId = await createClient(db, organizationId);
    invoiceId = await createDraftInvoice(db, organizationId, clientId);
  });

  test("accepts an invoice with as many lines as the limit", async () => {
    await insertLines({ invoiceId, count: LIMIT });

    expect(await countLines(invoiceId)).toBe(LIMIT);
  });

  test("rejects a line beyond the limit", async () => {
    await insertLines({ invoiceId, count: LIMIT });

    const error = await createLine(db, invoiceId).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot have more than 1000 lines");
    expect(await countLines(invoiceId)).toBe(LIMIT);
  });

  test("rejects a single insert crossing the limit", async () => {
    const error = await insertLines({ invoiceId, count: LIMIT + 1 }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot have more than 1000 lines");
    expect(await countLines(invoiceId)).toBe(0);
  });

  test("counts the lines of each invoice separately", async () => {
    await insertLines({ invoiceId, count: LIMIT });
    const otherInvoiceId = await createDraftInvoice(db, organizationId, clientId);

    await createLine(db, otherInvoiceId);

    expect(await countLines(otherInvoiceId)).toBe(1);
  });
});
