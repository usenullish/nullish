import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as z from "zod";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  AccountType,
  InvoiceJournalEntryType,
  PeriodStatus,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { DbCollectionJournal, DbJournal } from "../../../src/ledger/composites/journal";
import { DbPeriods } from "../../../src/ledger/records/periods";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  readAccountBalance,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  waitFor,
  leafAccountId,
} from "../../_test-utils";

type SelectJournal = Composites["Journal"]["Select"];

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const leafAccountIds = async (organizationId: string): Promise<[string, string]> => {
  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));

  const parentIds = new Set(
    rows.map((row) => row.parentId).filter((value): value is string => value !== null),
  );
  const leafIds = rows.filter((row) => !parentIds.has(row.id)).map((row) => row.id);

  const [first, second] = leafIds;
  assertNonNullish(first);
  assertNonNullish(second);
  return [first, second];
};

describe("DbJournal", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbJournal;
  let collectionStore: DbCollectionJournal;
  let leafDebitId: string;
  let leafCreditId: string;
  let insertedJournal: SelectJournal;
  let siblingJournalId: string;
  let otherJournalId: string;

  const journalValues = (overrides: {
    credit?: bigint;
    debitAccountId?: string;
    creditAccountId?: string;
  }) => ({
    entry: {
      validOn: new Date("2026-06-15"),
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

  const createCase = async (): Promise<{
    caseOrgId: string;
    periodId: string;
    journal: SelectJournal;
  }> => {
    const caseOrgId = await createOrganization(db, TEST_USER_ID);

    const [period] = await db
      .insert(periods)
      .values({
        organizationId: caseOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      })
      .returning();
    assertNonNullish(period);

    const [caseDebitId, caseCreditId] = await leafAccountIds(caseOrgId);

    const journal = await DbCollectionJournal.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: caseOrgId,
    }).insert({
      values: journalValues({ debitAccountId: caseDebitId, creditAccountId: caseCreditId }),
    });

    if (journal.status === "error") {
      throw journal.err;
    }

    return { caseOrgId, periodId: period.id, journal: journal.result };
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbJournal.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionJournal.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await db.insert(periods).values({
      organizationId: siblingOrgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await db.insert(periods).values({
      organizationId: otherOrgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    [leafDebitId, leafCreditId] = await leafAccountIds(orgId);
    const [siblingLeafDebitId, siblingLeafCreditId] = await leafAccountIds(siblingOrgId);
    const [otherLeafDebitId, otherLeafCreditId] = await leafAccountIds(otherOrgId);

    const inserted = await collectionStore.insert({ values: journalValues({}) });
    if (inserted.status === "error") {
      throw inserted.err;
    }
    insertedJournal = inserted.result;

    const siblingCollectionStore = DbCollectionJournal.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: siblingOrgId,
    });
    const sibling = await siblingCollectionStore.insert({
      values: journalValues({
        debitAccountId: siblingLeafDebitId,
        creditAccountId: siblingLeafCreditId,
      }),
    });
    if (sibling.status === "error") {
      throw sibling.err;
    }
    siblingJournalId = sibling.result.entry.id;

    const otherCollectionStore = DbCollectionJournal.create({
      db,
      userId: TEST_OTHER_USER_ID,
      foreignKeyId: otherOrgId,
    });
    const other = await otherCollectionStore.insert({
      values: {
        entry: {
          validOn: new Date("2026-06-15"),
          reference: "OTHER-JOURNAL",
        },
        postings: [
          {
            accountId: otherLeafDebitId,
            description: "Debit side",
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
            debit: 10000n,
            credit: 0n,
          },
          {
            accountId: otherLeafCreditId,
            description: "Credit side",
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
            debit: 0n,
            credit: 10000n,
          },
        ],
      },
    });
    if (other.status === "error") {
      throw other.err;
    }
    otherJournalId = other.result.entry.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the entry with its postings", async () => {
      const result = await store.find({ pKey: insertedJournal.entry.id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.entry.id).toBe(insertedJournal.entry.id);
      expect(result.result?.postings).toHaveLength(2);
    });

    test("returns a journal of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingJournalId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.entry.id).toBe(siblingJournalId);
      expect(result.result?.postings).toHaveLength(2);
    });

    test("resolves to undefined for a journal of another organization", async () => {
      const result = await store.find({ pKey: otherJournalId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("applies the change to the entry and its postings, bumping versions", async () => {
      const result = await store.update({
        pKey: insertedJournal.entry.id,
        values: {
          entry: {
            validOn: insertedJournal.entry.validOn,
            reference: "UPDATED-REFERENCE",
            version: insertedJournal.entry.version,
          },
          postings: insertedJournal.postings.map((posting) => ({
            id: posting.id,
            accountId: posting.accountId,
            description: `${posting.description} (updated)`,
            currency: posting.currency,
            exchangeRate: posting.exchangeRate,
            vatRateId: posting.vatRateId,
            debit: posting.debit,
            credit: posting.credit,
            version: posting.version,
          })),
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.entry.reference).toBe("UPDATED-REFERENCE");
      expect(result.result.entry.version).toBe(insertedJournal.entry.version + 1);
      expect(
        result.result.postings.every(
          (posting) => posting.description?.endsWith("(updated)") === true,
        ),
      ).toBeTrue();
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

    const toEntry = ({ validOn, reference, version }: SelectJournal["entry"]) => ({
      validOn,
      reference,
      version,
    });

    test("adds the postings without an ID", async () => {
      const {
        journal: { entry, postings },
      } = await createCase();
      const [debit, credit] = postings;
      assertNonNullish(debit);
      assertNonNullish(credit);

      const result = await store.update({
        pKey: entry.id,
        values: {
          entry: toEntry(entry),
          postings: [
            toUpdatePosting(debit),
            { ...toUpdatePosting(credit), credit: 6000n },
            {
              accountId: credit.accountId,
              description: "Added credit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 4000n,
            },
          ],
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.postings).toHaveLength(3);
      expect(result.result.postings.map(({ credit }) => credit)).toEqual([0n, 6000n, 4000n]);
      expect(result.result.postings[2]?.journalEntryId).toBe(entry.id);
    });

    test("removes the postings left out", async () => {
      const {
        journal: { entry, postings },
      } = await createCase();
      const [debit, credit] = postings;
      assertNonNullish(debit);
      assertNonNullish(credit);

      const result = await store.update({
        pKey: entry.id,
        values: {
          entry: toEntry(entry),
          postings: [
            toUpdatePosting(debit),
            {
              accountId: credit.accountId,
              description: "Replacing credit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 10000n,
            },
          ],
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.postings).toHaveLength(2);
      expect(result.result.postings.some(({ id }) => id === credit.id)).toBeFalse();

      const found = await store.find({ pKey: entry.id });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.postings.map(({ description }) => description).toSorted()).toEqual(
        ["Debit side", "Replacing credit side"].toSorted(),
      );
    });

    test("returns an error Result and keeps the postings when the result does not balance", async () => {
      const {
        journal: { entry, postings },
      } = await createCase();

      const result = await store.update({
        pKey: entry.id,
        values: {
          entry: toEntry(entry),
          postings: [
            ...postings.map(toUpdatePosting),
            {
              accountId: postings[0]?.accountId ?? "",
              description: "Unbalanced side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 500n,
              credit: 0n,
            },
          ],
        },
      });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: entry.id });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.postings).toHaveLength(2);
    });

    test("returns an error Result for a posting of another entry", async () => {
      const {
        journal: { entry, postings },
      } = await createCase();
      const {
        journal: { postings: otherPostings },
      } = await createCase();

      const result = await store.update({
        pKey: entry.id,
        values: {
          entry: toEntry(entry),
          postings: [postings[0], otherPostings[1]].filter(nonNullish).map(toUpdatePosting),
        },
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the entry id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: {
          entry: {
            validOn: new Date("2026-06-15"),
            reference: "GHOST",
            version: 1,
          },
          postings: insertedJournal.postings.map((posting) => ({
            id: posting.id,
            accountId: posting.accountId,
            description: posting.description,
            currency: posting.currency,
            exchangeRate: posting.exchangeRate,
            vatRateId: posting.vatRateId,
            debit: posting.debit,
            credit: posting.credit,
            version: posting.version,
          })),
        },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list", () => {
    test("returns only the journals of the parent organization with their postings", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(
        result.result.some((journal) => journal.entry.id === insertedJournal.entry.id),
      ).toBeTrue();
      expect(result.result.every((journal) => journal.entry.organizationId === orgId)).toBeTrue();
      expect(result.result.every((journal) => journal.entry.id !== siblingJournalId)).toBeTrue();
      expect(result.result.every((journal) => journal.postings.length >= 2)).toBeTrue();
    });

    test("paginates the entries while still returning each entry's postings", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 1, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.postings.length).toBeGreaterThanOrEqual(2);
    });

    test("returns a ZodError Result for an unknown sort field", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "nope" as never, direction: "asc" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and creates a balanced journal with its postings", async () => {
      const result = await collectionStore.insert({ values: journalValues({}) });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.entry.organizationId).toBe(orgId);
      expect(result.result.postings).toHaveLength(2);
    });

    test("returns an error Result when the postings do not balance", async () => {
      const result = await collectionStore.insert({ values: journalValues({ credit: 5000n }) });

      expect(result.status).toBe("error");
    });
  });

  describe("account balances view refresh", () => {
    test("refreshes ledger.mv_account_balances after inserting a journal", async () => {
      const caseOrgId = await createOrganization(db, TEST_USER_ID);
      await db.insert(periods).values({
        organizationId: caseOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });
      const [caseDebitId, caseCreditId] = await leafAccountIds(caseOrgId);
      const caseAccountRows = await db
        .select({ id: accounts.id, parentId: accounts.parentId })
        .from(accounts)
        .where(eq(accounts.organizationId, caseOrgId));
      const parentById = new Map(caseAccountRows.map((row) => [row.id, row.parentId]));

      const caseCollectionStore = DbCollectionJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: caseOrgId,
      });
      const result = await caseCollectionStore.insert({
        values: journalValues({
          debitAccountId: caseDebitId,
          creditAccountId: caseCreditId,
        }),
      });
      expect(result.status).toBe("success");

      const debitRow = await waitFor(
        () => readAccountBalance(db, caseDebitId),
        (balance) => balance?.totalDebit === 10000n,
      );
      expect(debitRow?.totalDebit).toBe(10000n);
      expect(debitRow?.totalCredit).toBe(0n);
      expect(debitRow?.parentId).toBe(parentById.get(caseDebitId) ?? null);

      const creditRow = await readAccountBalance(db, caseCreditId);
      expect(creditRow?.totalCredit).toBe(10000n);
      expect(creditRow?.totalDebit).toBe(0n);
      expect(creditRow?.parentId).toBe(parentById.get(caseCreditId) ?? null);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionJournal;
    let expenseAccountId: string;
    const entryIds: Record<"invoice" | "payment" | "expense", string> = {
      invoice: "",
      payment: "",
      expense: "",
    };

    const list = (filters: Composites["Journal"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "validOn", direction: "asc" },
        filters,
      });

    const idsOf = (journal: readonly SelectJournal[]): string[] =>
      journal.map(({ entry: { id } }) => id);

    beforeAll(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: filtersOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      filtersStore = DbCollectionJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      const assetAccountId = await leafAccountId(db, filtersOrgId, AccountType.ASSET);
      const incomeAccountId = await leafAccountId(db, filtersOrgId, AccountType.INCOME);
      expenseAccountId = await leafAccountId(db, filtersOrgId, AccountType.EXPENSE);

      for (const [key, validOn, reference, debitAccountId, creditAccountId] of [
        ["invoice", "2026-02-01", "INV-001", assetAccountId, incomeAccountId],
        ["payment", "2026-05-15", "PAY-002", assetAccountId, incomeAccountId],
        ["expense", "2026-09-30", null, expenseAccountId, assetAccountId],
      ] as const) {
        const result = await filtersStore.insert({
          values: {
            entry: { validOn: new Date(validOn), reference },
            postings: [
              {
                accountId: debitAccountId,
                description: "Debit side",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: 1000n,
                credit: 0n,
              },
              {
                accountId: creditAccountId,
                description: "Credit side",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: 0n,
                credit: 1000n,
              },
            ],
          },
        });

        if (result.status === "error") {
          throw result.err;
        }

        entryIds[key] = result.result.entry.id;
      }
    });

    test("returns the entries from the inclusive start date", async () => {
      const result = await list({ validOnFrom: new Date("2026-05-15") });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([entryIds.payment, entryIds.expense]);
    });

    test("returns the entries until the inclusive end date", async () => {
      const result = await list({ validOnTo: new Date("2026-05-15") });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([entryIds.invoice, entryIds.payment]);
    });

    test("returns the entries whose reference contains the search, case-insensitively", async () => {
      const result = await list({ reference: "inv" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([entryIds.invoice]);
    });

    test("returns the entries with a posting on the account, with all their postings", async () => {
      const result = await list({ accountId: expenseAccountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([entryIds.expense]);
      expect(result.result[0]?.postings).toHaveLength(2);
    });

    test("combines the filters", async () => {
      const result = await list({
        validOnFrom: new Date("2026-01-01"),
        validOnTo: new Date("2026-06-30"),
        reference: "pay",
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([entryIds.payment]);
    });
  });

  describe("delete", () => {
    test("deletes the entry with its postings and returns them", async () => {
      const { journal } = await createCase();

      const result = await store.delete({ pKey: journal.entry.id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.entry.id).toBe(journal.entry.id);
      expect(result.result?.postings).toHaveLength(2);
      expect(await store.find({ pKey: journal.entry.id })).toEqual({
        status: "success",
        result: undefined,
      });

      const postings = await db
        .select()
        .from(DbSchema.Ledger.Journal.PostingsSchema)
        .where(eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journal.entry.id));

      expect(postings).toHaveLength(0);
    });

    test("removes the balance of an account without other activity from ledger.mv_account_balances after deleting a journal", async () => {
      const { journal } = await createCase();
      const [posting] = journal.postings;
      assertNonNullish(posting);

      await waitFor(
        () => readAccountBalance(db, posting.accountId),
        (balance) => balance?.totalDebit === 10000n,
      );

      const result = await store.delete({ pKey: journal.entry.id });

      expect(result.status).toBe("success");

      const balance = await waitFor(
        () => readAccountBalance(db, posting.accountId),
        (row) => row === undefined,
      );

      expect(balance).toBeUndefined();
    });

    test("returns an error Result and keeps an entry of a closed period", async () => {
      const { periodId, journal } = await createCase();

      const closed = await DbPeriods.create({ db, userId: TEST_USER_ID }).update({
        pKey: periodId,
        values: { version: 1, status: PeriodStatus.CLOSED },
      });

      expect(closed.status).toBe("success");

      const result = await store.delete({ pKey: journal.entry.id });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: journal.entry.id });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.postings).toHaveLength(2);
    });

    test("returns an error Result and keeps an entry linked to an invoice", async () => {
      const { caseOrgId, journal } = await createCase();
      const clientId = await createClient(db, caseOrgId);
      const invoiceId = await createDraftInvoice(db, { organizationId: caseOrgId, clientId });

      await db.insert(invoiceJournalEntries).values({
        organizationId: caseOrgId,
        invoiceId,
        journalEntryId: journal.entry.id,
        type: InvoiceJournalEntryType.OPEN,
      });

      const result = await store.delete({ pKey: journal.entry.id });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: journal.entry.id });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.postings).toHaveLength(2);
    });

    test("resolves to undefined and keeps an entry of another organization", async () => {
      const result = await store.delete({ pKey: otherJournalId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbJournal.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherJournalId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.entry.id).toBe(otherJournalId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
