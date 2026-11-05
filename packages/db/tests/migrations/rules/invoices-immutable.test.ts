import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
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

describe("check_invoices_client_immutable", () => {
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

  test("rejects changing organization_id once set", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(invoices)
      .set({ organizationId: otherOrganizationId })
      .where(eq(invoices.id, invoiceId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("rejects changing client_id once set", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const otherClientId = await createClient(db, organizationId);

    const error = await db
      .update(invoices)
      .set({ clientId: otherClientId })
      .where(eq(invoices.id, invoiceId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("client_id cannot be changed once set");
  });

  test("allows changing unrelated fields", async () => {
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);

    const [updated] = await db
      .update(invoices)
      .set({ dueOn: new Date("2026-02-01") })
      .where(eq(invoices.id, invoiceId))
      .returning();

    expect(updated?.dueOn).toEqual(new Date("2026-02-01"));
  });
});
