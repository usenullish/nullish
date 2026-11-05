import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { InvoiceJournalEntryType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createInvoiceJournalEntry,
  createJournalEntry,
  createOrganization,
  createPeriod,
  invoiceJournalEntries,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_invoice_journal_entries_immutable", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  });

  test("rejects any update, even a no-op one", async () => {
    const clientId = await createClient(db, organizationId);
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    const rowId = await createInvoiceJournalEntry(db, invoiceId, journalEntryId);

    const error = await db
      .update(invoiceJournalEntries)
      .set({ type: InvoiceJournalEntryType.OPEN })
      .where(eq(invoiceJournalEntries.id, rowId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified once created");
  });
});
