import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createOrganization,
  invoices,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_new_invoice_is_draft", () => {
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

  test("rejects creating an invoice with a non-draft status", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
        status: InvoiceStatus.OPEN,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("New invoices must be created with status draft");
  });

  test("allows creating an invoice with the default draft status", async () => {
    const [row] = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
      })
      .returning();

    expect(row?.status).toBe(InvoiceStatus.DRAFT);
  });
});
