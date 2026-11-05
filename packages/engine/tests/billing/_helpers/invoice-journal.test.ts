import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, InvoiceJournalEntryType } from "@usenullish/nullish-schema/db";
import {
  getInvoiceJournalEntryForInvoice,
  insertInvoiceJournalEntry,
  listInvoiceJournalEntries,
} from "../../../src/billing/_helpers/invoice-journal";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("billing/_helpers/invoice-journal", () => {
  let orgId: string;
  let invoiceId: string;
  let journalEntryIdA: string;
  let journalEntryIdB: string;

  const seedJournalEntry = async (): Promise<string> => {
    const [row] = await db
      .insert(journalEntries)
      .values({ organizationId: orgId, validOn: new Date("2026-06-15") })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    const clientId = await createClient(db, orgId);
    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });

    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    journalEntryIdA = await seedJournalEntry();
    journalEntryIdB = await seedJournalEntry();
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE billing.invoice_journal_entries CASCADE;`);
  });

  describe("insertInvoiceJournalEntry", () => {
    test("records the link between the invoice and the journal entry", async () => {
      await db.transaction((tx) =>
        insertInvoiceJournalEntry({
          tx,
          organizationId: orgId,
          invoiceId,
          journalEntryId: journalEntryIdA,
          entryType: InvoiceJournalEntryType.OPEN,
        }),
      );

      const rows = await db
        .select()
        .from(invoiceJournalEntries)
        .where(eq(invoiceJournalEntries.invoiceId, invoiceId));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.journalEntryId).toBe(journalEntryIdA);
      expect(rows[0]?.type).toBe(InvoiceJournalEntryType.OPEN);
    });
  });

  describe("getInvoiceJournalEntryForInvoice", () => {
    test("returns the single entry of the given type", async () => {
      await db.insert(invoiceJournalEntries).values({
        organizationId: orgId,
        invoiceId,
        journalEntryId: journalEntryIdA,
        type: InvoiceJournalEntryType.OPEN,
      });

      const entry = await db.transaction((tx) =>
        getInvoiceJournalEntryForInvoice({
          tx,
          invoiceId,
          entryType: InvoiceJournalEntryType.OPEN,
        }),
      );

      expect(entry.invoiceId).toBe(invoiceId);
      expect(entry.type).toBe(InvoiceJournalEntryType.OPEN);
    });

    test("rejects when there is no entry of that type", async () => {
      await expect(
        db.transaction((tx) =>
          getInvoiceJournalEntryForInvoice({
            tx,
            invoiceId,
            entryType: InvoiceJournalEntryType.OPEN,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("listInvoiceJournalEntries", () => {
    test("returns every entry of the given type", async () => {
      await db.insert(invoiceJournalEntries).values([
        {
          organizationId: orgId,
          invoiceId,
          journalEntryId: journalEntryIdA,
          type: InvoiceJournalEntryType.PAYMENT,
        },
        {
          organizationId: orgId,
          invoiceId,
          journalEntryId: journalEntryIdB,
          type: InvoiceJournalEntryType.PAYMENT,
        },
      ]);

      const entries = await db.transaction((tx) =>
        listInvoiceJournalEntries({
          tx,
          invoiceId,
          entryType: InvoiceJournalEntryType.PAYMENT,
        }),
      );

      expect(entries).toHaveLength(2);
    });

    test("returns an empty array when there are none", async () => {
      const entries = await db.transaction((tx) =>
        listInvoiceJournalEntries({
          tx,
          invoiceId,
          entryType: InvoiceJournalEntryType.OPEN,
        }),
      );

      expect(entries).toEqual([]);
    });
  });
});
