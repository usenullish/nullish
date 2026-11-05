import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { InvoiceJournalEntryType } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createJournalEntry,
  createOrganization,
  createPeriod,
  invoiceJournalEntries,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_invoice_journal_entries_organization", () => {
  let organizationId: string;
  let otherOrganizationId: string;
  let invoiceId: string;
  let journalEntryId: string;

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
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    invoiceId = await createDraftInvoice(
      db,
      organizationId,
      await createClient(db, organizationId),
    );
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    otherOrganizationId = await createOrganization(db);
  });

  test("rejects a link with another organization than its invoice", async () => {
    const error = await db
      .insert(invoiceJournalEntries)
      .values({
        organizationId: otherOrganizationId,
        invoiceId,
        journalEntryId,
        type: InvoiceJournalEntryType.OPEN,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.invoices");
  });
});
