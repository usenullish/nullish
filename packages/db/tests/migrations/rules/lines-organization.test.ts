import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { InvoiceLineType } from "@usenullish/nullish-schema/db";
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

const insertLine = ({ organizationId, invoiceId }: { organizationId: string; invoiceId: string }) =>
  db
    .insert(lines)
    .values({
      organizationId,
      invoiceId,
      type: InvoiceLineType.ITEM,
      description: "Line",
      quantity: 1,
      unitPrice: 1000n,
    })
    .returning();

describe("check_lines_organization", () => {
  let organizationId: string;
  let invoiceId: string;
  let otherOrganizationId: string;
  let otherInvoiceId: string;

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
    invoiceId = await createDraftInvoice(
      db,
      organizationId,
      await createClient(db, organizationId),
    );

    otherOrganizationId = await createOrganization(db);
    otherInvoiceId = await createDraftInvoice(
      db,
      otherOrganizationId,
      await createClient(db, otherOrganizationId),
    );
  });

  test("accepts a line with the organization of its invoice", async () => {
    const [row] = await insertLine({ organizationId, invoiceId });

    expect(row?.organizationId).toBe(organizationId);
  });

  test("rejects a line with another organization than its invoice", async () => {
    const error = await insertLine({ organizationId: otherOrganizationId, invoiceId }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.invoices");
  });

  test("rejects changing the organization of a line", async () => {
    const lineId = await createLine(db, invoiceId);

    const error = await db
      .update(lines)
      .set({ organizationId: otherOrganizationId })
      .where(eq(lines.id, lineId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.invoices");
  });

  test("rejects moving a line to an invoice of another organization", async () => {
    const lineId = await createLine(db, invoiceId);

    const error = await db
      .update(lines)
      .set({ invoiceId: otherInvoiceId })
      .where(eq(lines.id, lineId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.invoices");
  });
});
