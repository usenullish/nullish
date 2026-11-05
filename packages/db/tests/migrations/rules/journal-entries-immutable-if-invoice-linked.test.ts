import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createInvoiceJournalEntry,
  createJournalEntry,
  createOrganization,
  createPeriod,
  journalEntries,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_journal_entry_immutable_if_invoice_linked", () => {
  let organizationId: string;
  let journalEntryId: string;

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
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
  });

  const linkToInvoice = async (): Promise<void> => {
    const clientId = await createClient(db, organizationId);
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    await createInvoiceJournalEntry(db, invoiceId, journalEntryId);
  };

  test("allows updating a journal entry that is not linked to an invoice", async () => {
    const [row] = await db
      .update(journalEntries)
      .set({ reference: "Manual entry" })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    expect(row?.reference).toBe("Manual entry");
  });

  test("allows deleting a journal entry that is not linked to an invoice", async () => {
    await db.delete(journalEntries).where(eq(journalEntries.id, journalEntryId));

    const rows = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, journalEntryId));

    expect(rows).toHaveLength(0);
  });

  test("rejects updating a journal entry linked to an invoice", async () => {
    await linkToInvoice();

    const error = await db
      .update(journalEntries)
      .set({ reference: "Tampered" })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is linked to an invoice and cannot be modified");
  });

  test("rejects deleting a journal entry linked to an invoice", async () => {
    await linkToInvoice();

    const error = await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is linked to an invoice and cannot be modified");
  });
});
