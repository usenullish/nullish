import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import {
  deleteJournal,
  findJournalById,
  getJournalEntry,
  insertJournal,
  listJournals,
  listPostings,
  updateJournal,
} from "../../../src/ledger/_helpers/journal";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

type SelectJournal = Composites["Journal"]["Select"];

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postingsTable = DbSchema.Ledger.Journal.PostingsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("ledger/_helpers/journal", () => {
  let orgId: string;
  let leafDebitId: string;
  let leafCreditId: string;
  let nonLeafId: string;
  let journalEntryId: string;

  const journalValues = (overrides: {
    debitAccountId?: string;
    creditAccountId?: string;
    validOn?: Date;
    credit?: bigint;
  }) => ({
    entry: {
      organizationId: orgId,
      validOn: overrides.validOn ?? new Date("2026-06-15"),
      reference: "TEST-JOURNAL",
    },
    postings: [
      {
        accountId: overrides.debitAccountId ?? leafDebitId,
        description: "Debit side",
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
        vatRateId: null,
        debit: 10000n,
        credit: 0n,
      },
      {
        accountId: overrides.creditAccountId ?? leafCreditId,
        description: "Credit side",
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
        vatRateId: null,
        debit: 0n,
        credit: overrides.credit ?? 10000n,
      },
    ],
  });

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);

    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    const rows = await db
      .select({ id: accounts.id, parentId: accounts.parentId })
      .from(accounts)
      .where(eq(accounts.organizationId, orgId));

    const parentIds = new Set(
      rows.map((row) => row.parentId).filter((value): value is string => value !== null),
    );
    const leafIds = rows.filter((row) => !parentIds.has(row.id)).map((row) => row.id);
    const nonLeafIds = rows.filter((row) => parentIds.has(row.id)).map((row) => row.id);

    const [firstLeaf, secondLeaf] = leafIds;
    const [firstNonLeaf] = nonLeafIds;
    assertNonNullish(firstLeaf);
    assertNonNullish(secondLeaf);
    assertNonNullish(firstNonLeaf);

    leafDebitId = firstLeaf;
    leafCreditId = secondLeaf;
    nonLeafId = firstNonLeaf;

    const journal = await db.transaction((tx) => insertJournal({ tx, values: journalValues({}) }));
    journalEntryId = journal.entry.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("insertJournal", () => {
    test("creates a balanced journal entry with its postings", async () => {
      const journal = await db.transaction((tx) =>
        insertJournal({ tx, values: journalValues({}) }),
      );

      expect(journal.entry.organizationId).toBe(orgId);
      expect(journal.postings).toHaveLength(2);
    });

    test("numbers the entry after the previous one of the organization", async () => {
      const previous = await db.transaction((tx) =>
        insertJournal({ tx, values: journalValues({}) }),
      );

      const journal = await db.transaction((tx) =>
        insertJournal({ tx, values: journalValues({}) }),
      );

      expect(journal.entry.number).toBe(previous.entry.number + 1);
    });

    test("rejects when the postings do not balance", async () => {
      await expect(
        db.transaction((tx) => insertJournal({ tx, values: journalValues({ credit: 5000n }) })),
      ).rejects.toThrow();
    });

    test("rejects a posting against a non-leaf account", async () => {
      await expect(
        db.transaction((tx) =>
          insertJournal({ tx, values: journalValues({ debitAccountId: nonLeafId }) }),
        ),
      ).rejects.toThrow();
    });

    test("rejects an entry whose date falls in no open period", async () => {
      await expect(
        db.transaction((tx) =>
          insertJournal({ tx, values: journalValues({ validOn: new Date("2020-01-01") }) }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("getJournalEntry", () => {
    test("returns the entry matching the id", async () => {
      const entry = await db.transaction((tx) =>
        getJournalEntry({ tx, journalId: journalEntryId }),
      );

      expect(entry.id).toBe(journalEntryId);
      expect(entry.organizationId).toBe(orgId);
    });

    test("rejects when the id matches nothing", async () => {
      await expect(
        db.transaction((tx) => getJournalEntry({ tx, journalId: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("listPostings", () => {
    test("returns every posting of the journal entry", async () => {
      const postings = await db.transaction((tx) =>
        listPostings({ tx, journalId: journalEntryId }),
      );

      expect(postings).toHaveLength(2);
    });

    test("rejects when the entry has no postings", async () => {
      await expect(
        db.transaction((tx) => listPostings({ tx, journalId: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("updateJournal", () => {
    const insertFreshJournal = (): Promise<SelectJournal> =>
      db.transaction((tx) => insertJournal({ tx, values: journalValues({}) }));

    const toEntry = ({ validOn, reference, version }: SelectJournal["entry"]) => ({
      validOn,
      reference,
      version,
    });

    const toUpdatePosting = ({
      id,
      version,
      accountId,
      description,
      currency,
      exchangeRate,
      vatRateId,
      debit,
      credit,
    }: SelectJournal["postings"][number]) => ({
      id,
      version,
      accountId,
      description,
      currency,
      exchangeRate,
      vatRateId,
      debit,
      credit,
    });

    const newPosting = ({ debit, credit }: { debit: bigint; credit: bigint }) => ({
      accountId: credit > 0n ? leafCreditId : leafDebitId,
      description: "Added side",
      currency: "CHF",
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId: null,
      debit,
      credit,
    });

    test("updates the entry and its postings", async () => {
      const { entry, postings } = await insertFreshJournal();

      const journal = await db.transaction((tx) =>
        updateJournal({
          tx,
          journalId: entry.id,
          values: {
            entry: { ...toEntry(entry), reference: "UPDATED" },
            postings: postings.map((posting) => ({
              ...toUpdatePosting(posting),
              description: `${posting.description} (updated)`,
            })),
          },
        }),
      );

      expect(journal.entry.reference).toBe("UPDATED");
      expect(journal.entry.number).toBe(entry.number);
      expect(journal.postings.map(({ id }) => id).toSorted()).toEqual(
        postings.map(({ id }) => id).toSorted(),
      );
      expect(
        journal.postings.every(({ description }) => description?.endsWith("(updated)") === true),
      ).toBeTrue();
    });

    test("adds the postings without an ID", async () => {
      const { entry, postings } = await insertFreshJournal();
      const [debit, credit] = postings;
      assertNonNullish(debit);
      assertNonNullish(credit);

      const journal = await db.transaction((tx) =>
        updateJournal({
          tx,
          journalId: entry.id,
          values: {
            entry: toEntry(entry),
            postings: [
              toUpdatePosting(debit),
              { ...toUpdatePosting(credit), credit: 6000n },
              newPosting({ debit: 0n, credit: 4000n }),
            ],
          },
        }),
      );

      expect(journal.postings).toHaveLength(3);
      expect(
        journal.postings.every(({ journalEntryId }) => journalEntryId === entry.id),
      ).toBeTrue();
    });

    test("removes the postings left out", async () => {
      const { entry, postings } = await insertFreshJournal();
      const [debit, credit] = postings;
      assertNonNullish(debit);
      assertNonNullish(credit);

      await db.transaction((tx) =>
        updateJournal({
          tx,
          journalId: entry.id,
          values: {
            entry: toEntry(entry),
            postings: [toUpdatePosting(debit), newPosting({ debit: 0n, credit: 10000n })],
          },
        }),
      );

      const rows = await db
        .select()
        .from(postingsTable)
        .where(eq(postingsTable.journalEntryId, entry.id));

      expect(rows).toHaveLength(2);
      expect(rows.some(({ id }) => id === credit.id)).toBeFalse();
    });

    test("removes every posting when none has an ID", async () => {
      const { entry, postings } = await insertFreshJournal();

      await db.transaction((tx) =>
        updateJournal({
          tx,
          journalId: entry.id,
          values: {
            entry: toEntry(entry),
            postings: [
              newPosting({ debit: 10000n, credit: 0n }),
              newPosting({ debit: 0n, credit: 10000n }),
            ],
          },
        }),
      );

      const rows = await db
        .select()
        .from(postingsTable)
        .where(eq(postingsTable.journalEntryId, entry.id));

      expect(rows).toHaveLength(2);
      expect(rows.some(({ id }) => postings.some((posting) => posting.id === id))).toBeFalse();
    });

    test("rejects when the postings do not balance", async () => {
      const { entry, postings } = await insertFreshJournal();

      await expect(
        db.transaction((tx) =>
          updateJournal({
            tx,
            journalId: entry.id,
            values: {
              entry: toEntry(entry),
              postings: [...postings.map(toUpdatePosting), newPosting({ debit: 500n, credit: 0n })],
            },
          }),
        ),
      ).rejects.toThrow();
    });

    test("rejects a posting of another entry", async () => {
      const { entry, postings } = await insertFreshJournal();
      const { postings: otherPostings } = await insertFreshJournal();
      const [debit] = postings;
      const [, otherCredit] = otherPostings;
      assertNonNullish(debit);
      assertNonNullish(otherCredit);

      await expect(
        db.transaction((tx) =>
          updateJournal({
            tx,
            journalId: entry.id,
            values: {
              entry: toEntry(entry),
              postings: [toUpdatePosting(debit), toUpdatePosting(otherCredit)],
            },
          }),
        ),
      ).rejects.toThrow();
    });

    test("rejects when the id matches nothing", async () => {
      const { entry, postings } = await insertFreshJournal();

      await expect(
        db.transaction((tx) =>
          updateJournal({
            tx,
            journalId: TEST_MISSING_ID,
            values: { entry: toEntry(entry), postings: postings.map(toUpdatePosting) },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("deleteJournal", () => {
    test("deletes the entry with its postings and returns them", async () => {
      const { entry } = await db.transaction((tx) =>
        insertJournal({ tx, values: journalValues({}) }),
      );

      const journal = await db.transaction((tx) => deleteJournal({ tx, journalId: entry.id }));

      expect(journal?.entry.id).toBe(entry.id);
      expect(journal?.postings).toHaveLength(2);

      const entries = await db.select().from(journalEntries).where(eq(journalEntries.id, entry.id));
      const rows = await db
        .select()
        .from(postingsTable)
        .where(eq(postingsTable.journalEntryId, entry.id));

      expect(entries).toHaveLength(0);
      expect(rows).toHaveLength(0);
    });

    test("resolves to undefined when the id matches nothing", async () => {
      const journal = await db.transaction((tx) =>
        deleteJournal({ tx, journalId: TEST_MISSING_ID }),
      );

      expect(journal).toBeUndefined();
    });
  });

  describe("findJournalById", () => {
    test("returns the entry with its postings", async () => {
      const journal = await db.transaction((tx) => findJournalById({ tx, id: journalEntryId }));

      expect(journal?.entry.id).toBe(journalEntryId);
      expect(journal?.postings).toHaveLength(2);
    });

    test("resolves to undefined when the id matches nothing", async () => {
      const journal = await db.transaction((tx) => findJournalById({ tx, id: TEST_MISSING_ID }));

      expect(journal).toBeUndefined();
    });
  });

  describe("listJournals", () => {
    const queryArgs = {
      pagination: { limit: 100, offset: 0 },
      orderBy: [asc(journalEntries.validOn)],
    };

    let listOrgId: string;
    let assetAccountId: string;
    let incomeAccountId: string;
    let expenseAccountId: string;
    let januaryId: string;
    let februaryId: string;
    let marchId: string;

    const insertListJournal = async ({
      validOn,
      reference,
      creditAccountId,
    }: {
      validOn: Date;
      reference: string;
      creditAccountId: string;
    }): Promise<string> => {
      const {
        entry: { id },
      } = await db.transaction((tx) =>
        insertJournal({
          tx,
          values: {
            entry: { organizationId: listOrgId, validOn, reference },
            postings: [
              {
                accountId: assetAccountId,
                description: "Debit side",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: 10000n,
                credit: 0n,
              },
              {
                accountId: creditAccountId,
                description: "Credit side",
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

      return id;
    };

    const list = (filters?: Parameters<typeof listJournals>[0]["filters"]) =>
      db.transaction((tx) =>
        listJournals({ tx, organizationId: listOrgId, filters, ...queryArgs }),
      );

    beforeAll(async () => {
      listOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: listOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      assetAccountId = await leafAccountId(db, listOrgId, AccountType.ASSET);
      incomeAccountId = await leafAccountId(db, listOrgId, AccountType.INCOME);
      expenseAccountId = await leafAccountId(db, listOrgId, AccountType.EXPENSE);

      januaryId = await insertListJournal({
        validOn: new Date("2026-01-10"),
        reference: "RENT-JANUARY",
        creditAccountId: incomeAccountId,
      });
      februaryId = await insertListJournal({
        validOn: new Date("2026-02-10"),
        reference: "RENT-FEBRUARY",
        creditAccountId: expenseAccountId,
      });
      marchId = await insertListJournal({
        validOn: new Date("2026-03-10"),
        reference: "INSURANCE",
        creditAccountId: incomeAccountId,
      });
    });

    test("returns every entry of the organization with its postings when no filter is set", async () => {
      const journals = await list();

      expect(journals.map(({ entry: { id } }) => id)).toEqual([januaryId, februaryId, marchId]);
      expect(journals.every(({ postings }) => postings.length === 2)).toBeTrue();
    });

    test("excludes the entries of another organization", async () => {
      const otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

      const journals = await db.transaction((tx) =>
        listJournals({ tx, organizationId: otherOrgId, filters: undefined, ...queryArgs }),
      );

      expect(journals).toEqual([]);
    });

    test("returns the entry with the number", async () => {
      const [, february] = await list();
      assertNonNullish(february);

      const journals = await list({ number: february.entry.number });

      expect(journals.map(({ entry: { id } }) => id)).toEqual([februaryId]);
    });

    test("returns the entries valid within the inclusive date bounds", async () => {
      const journals = await list({
        validOnFrom: new Date("2026-02-10"),
        validOnTo: new Date("2026-03-10"),
      });

      expect(journals.map(({ entry: { id } }) => id)).toEqual([februaryId, marchId]);
    });

    test("returns the entries whose reference contains the search, case-insensitively", async () => {
      const journals = await list({ reference: "rent" });

      expect(journals.map(({ entry: { id } }) => id)).toEqual([januaryId, februaryId]);
    });

    test("returns the entries with a posting on the account, with all their postings", async () => {
      const journals = await list({ accountId: expenseAccountId });

      expect(journals.map(({ entry: { id } }) => id)).toEqual([februaryId]);
      expect(journals[0]?.postings).toHaveLength(2);
    });

    test("paginates the entries", async () => {
      const journals = await db.transaction((tx) =>
        listJournals({
          tx,
          organizationId: listOrgId,
          filters: undefined,
          ...queryArgs,
          pagination: { limit: 1, offset: 1 },
        }),
      );

      expect(journals.map(({ entry: { id } }) => id)).toEqual([februaryId]);
    });
  });
});
