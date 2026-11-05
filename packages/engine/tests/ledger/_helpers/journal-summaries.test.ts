import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  PeriodJournalEntryType,
} from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { insertJournal } from "../../../src/ledger/_helpers/journal";
import { loadJournalSummaries } from "../../../src/ledger/_helpers/journal-summaries";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createOrganization,
  leafAccountId,
  randomDedupeHash,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

type Journal = Composites["Journal"]["Select"];

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;
const postingManualVatPostings =
  DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("ledger/_helpers/journal-summaries", () => {
  let orgId: string;
  let periodId: string;
  let clientId: string;
  let assetAccountId: string;
  let incomeAccountId: string;

  const insertTestJournal = (): Promise<Journal> =>
    db.transaction((tx) =>
      insertJournal({
        tx,
        values: {
          entry: { organizationId: orgId, validOn: new Date("2026-06-15"), reference: "TEST" },
          postings: [
            {
              accountId: assetAccountId,
              description: null,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 10000n,
              credit: 0n,
            },
            {
              accountId: incomeAccountId,
              description: null,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 10000n,
            },
          ],
        },
      }),
    );

  const linkToInvoice = async ({
    journal,
    type,
  }: {
    journal: Journal;
    type: InvoiceJournalEntryType;
  }): Promise<string> => {
    const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });

    await db
      .insert(invoiceJournalEntries)
      .values({ organizationId: orgId, invoiceId, journalEntryId: journal.entry.id, type });

    return invoiceId;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    clientId = await createClient(db, orgId);

    const [period] = await db
      .insert(periods)
      .values({
        organizationId: orgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      })
      .returning();
    assertNonNullish(period);
    periodId = period.id;

    assetAccountId = await leafAccountId(db, orgId, AccountType.ASSET);
    incomeAccountId = await leafAccountId(db, orgId, AccountType.INCOME);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("loadJournalSummaries", () => {
    test("returns no invoice journal for an entry that is not linked to an invoice", async () => {
      const journal = await insertTestJournal();

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.entry.id).toBe(journal.entry.id);
      expect(summary?.postings).toHaveLength(2);
      expect(summary?.invoiceJournal).toBeNull();
    });

    test("returns the invoice and the type of an entry linked to an invoice", async () => {
      const journal = await insertTestJournal();
      const invoiceId = await linkToInvoice({ journal, type: InvoiceJournalEntryType.PAYMENT });

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.invoiceJournal).toEqual({
        invoiceId,
        type: InvoiceJournalEntryType.PAYMENT,
      });
    });

    test("returns no period journal for an entry that is not linked to a period", async () => {
      const journal = await insertTestJournal();

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.periodJournal).toBeNull();
    });

    test("returns the period and the type of an entry linked to a period", async () => {
      const journal = await insertTestJournal();

      await db.insert(periodJournalEntries).values({
        organizationId: orgId,
        periodId,
        journalEntryId: journal.entry.id,
        type: PeriodJournalEntryType.OPENING,
      });

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.periodJournal).toEqual({
        periodId,
        type: PeriodJournalEntryType.OPENING,
      });
      expect(summary?.invoiceJournal).toBeNull();
    });

    test("returns no movement journal for an entry that is not linked to a movement", async () => {
      const journal = await insertTestJournal();

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.movementJournal).toBeNull();
    });

    test("returns the movement and its bank relation of an entry linked to a movement", async () => {
      const journal = await insertTestJournal();
      const bankRelationId = await createBankRelation(db, orgId);
      const statementId = await createBankStatement(db, { organizationId: orgId, bankRelationId });

      const movement = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(movements)
          .values({
            organizationId: orgId,
            bankRelationId,
            statementId,
            bankReference: crypto.randomUUID(),
            dedupeHash: randomDedupeHash(),
            bookedOn: new Date("2026-06-15"),
            amount: 10000n,
            currency: "CHF",
            status: BankMovementStatus.RECONCILED,
          })
          .returning();
        assertNonNullish(row);

        await tx
          .insert(movementJournalEntries)
          .values({ organizationId: orgId, movementId: row.id, journalEntryId: journal.entry.id });

        return row;
      });

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.movementJournal).toEqual({ movementId: movement.id, bankRelationId });
    });

    test("returns no VAT postings for an entry without VAT postings", async () => {
      const journal = await insertTestJournal();

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.vatPostings).toEqual([]);
    });

    test("returns the links between the postings of an entry and their VAT postings", async () => {
      const journal = await insertTestJournal();
      const [posting, vatPosting] = journal.postings;
      assertNonNullish(posting);
      assertNonNullish(vatPosting);

      await db
        .insert(postingManualVatPostings)
        .values({ organizationId: orgId, postingId: posting.id, vatPostingId: vatPosting.id });

      const [summary] = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [journal] }),
      );

      expect(summary?.vatPostings).toEqual([
        { postingId: posting.id, vatPostingId: vatPosting.id },
      ]);
    });

    test("summarizes several entries at once in their order", async () => {
      const manual = await insertTestJournal();
      const opened = await insertTestJournal();
      const voided = await insertTestJournal();
      await linkToInvoice({ journal: opened, type: InvoiceJournalEntryType.OPEN });
      await linkToInvoice({ journal: voided, type: InvoiceJournalEntryType.VOID });

      const summaries = await db.transaction((tx) =>
        loadJournalSummaries({ tx, journals: [manual, opened, voided] }),
      );

      expect(summaries.map(({ entry: { id } }) => id)).toEqual([
        manual.entry.id,
        opened.entry.id,
        voided.entry.id,
      ]);
      expect(summaries.map(({ invoiceJournal }) => invoiceJournal?.type ?? null)).toEqual([
        null,
        InvoiceJournalEntryType.OPEN,
        InvoiceJournalEntryType.VOID,
      ]);
    });
  });
});
