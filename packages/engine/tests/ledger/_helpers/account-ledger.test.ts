import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  type QueryArgs,
} from "@usenullish/nullish-schema/db";
import type { Reports } from "@usenullish/nullish-schema/reports";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import { listAccountLedger, totalAccountLedger } from "../../../src/ledger/_helpers/account-ledger";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

interface Fixture {
  organizationId: string;
  periodId: string;
  nextPeriodId: string;
  assetId: string;
  incomeId: string;
}

const seedOrganization = async (): Promise<Fixture> => {
  const organizationId = await createOrganization(db, TEST_USER_ID);

  const [period, nextPeriod] = await db
    .insert(periods)
    .values([
      { organizationId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") },
      { organizationId, startOn: new Date("2027-01-01"), endOn: new Date("2027-12-31") },
    ])
    .returning();
  assertNonNullish(period);
  assertNonNullish(nextPeriod);

  return {
    organizationId,
    periodId: period.id,
    nextPeriodId: nextPeriod.id,
    assetId: await leafAccountId(db, organizationId, AccountType.ASSET),
    incomeId: await leafAccountId(db, organizationId, AccountType.INCOME),
  };
};

const book = async ({
  organizationId,
  validOn,
  reference,
  debitAccountId,
  creditAccountId,
  amount,
  currency = "CHF",
  exchangeRate = EXCHANGE_RATE_ONE,
}: {
  organizationId: string;
  validOn: Date;
  reference: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
  currency?: string;
  exchangeRate?: number;
}): Promise<void> => {
  const journal = await DbCollectionJournal.create({
    db,
    userId: TEST_USER_ID,
    foreignKeyId: organizationId,
  }).insert({
    values: {
      entry: { validOn, reference },
      postings: [
        {
          accountId: debitAccountId,
          description: `${reference} debit`,
          currency,
          exchangeRate,
          vatRateId: null,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: creditAccountId,
          description: `${reference} credit`,
          currency,
          exchangeRate,
          vatRateId: null,
          debit: 0n,
          credit: amount,
        },
      ],
    },
  });

  if (journal.status === "error") {
    throw journal.err;
  }
};

describe("ledger/_helpers/account-ledger", () => {
  let fixture: Fixture;

  const ledgerOf = ({
    accountId,
    periodId,
    filters,
    pagination = { limit: 100, offset: 0 },
    sort = { field: "validOn", direction: "asc" },
  }: {
    accountId: string;
    periodId: string;
    filters?: Reports["Ledger"]["AccountLedger"]["Filter"];
  } & Partial<QueryArgs<Reports["Ledger"]["AccountLedger"]["SortField"]>>) =>
    db.transaction((tx) =>
      listAccountLedger({
        tx,
        organizationId: fixture.organizationId,
        periodId,
        accountId,
        filters,
        pagination,
        sort,
      }),
    );

  const totalsOf = ({
    accountId,
    periodId,
    filters,
  }: {
    accountId: string;
    periodId: string;
    filters?: Reports["Ledger"]["AccountLedger"]["Filter"];
  }) =>
    db.transaction((tx) =>
      totalAccountLedger({
        tx,
        organizationId: fixture.organizationId,
        periodId,
        accountId,
        filters,
      }),
    );

  const bookThree = async () => {
    await book({
      organizationId: fixture.organizationId,
      validOn: new Date("2026-03-01"),
      reference: "IN",
      debitAccountId: fixture.assetId,
      creditAccountId: fixture.incomeId,
      amount: 1000n,
    });
    await book({
      organizationId: fixture.organizationId,
      validOn: new Date("2026-04-01"),
      reference: "OUT",
      debitAccountId: fixture.incomeId,
      creditAccountId: fixture.assetId,
      amount: 300n,
    });
    await book({
      organizationId: fixture.organizationId,
      validOn: new Date("2026-05-01"),
      reference: "IN AGAIN",
      debitAccountId: fixture.assetId,
      creditAccountId: fixture.incomeId,
      amount: 50n,
    });
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    fixture = await seedOrganization();
  });

  describe("listAccountLedger", () => {
    test("returns nothing for an account without postings in the period", async () => {
      const postings = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(postings).toEqual([]);
    });

    test("returns the postings of the account in date order with their entry", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-09-01"),
        reference: "LATER",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 500n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "EARLIER",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });

      const postings = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(postings.map(({ reference }) => reference)).toEqual(["EARLIER", "LATER"]);
      expect(postings.map(({ validOn }) => validOn)).toEqual([
        new Date("2026-03-01"),
        new Date("2026-09-01"),
      ]);
      expect(postings.map(({ description }) => description)).toEqual([
        "EARLIER debit",
        "LATER debit",
      ]);
      expect(postings.every(({ number }) => number > 0)).toBeTrue();
    });

    test("keeps a running balance that grows with debits on an asset account", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "IN",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-04-01"),
        reference: "OUT",
        debitAccountId: fixture.incomeId,
        creditAccountId: fixture.assetId,
        amount: 300n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-05-01"),
        reference: "IN AGAIN",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 50n,
      });

      const postings = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(postings.map(({ debit }) => debit)).toEqual([1000n, 0n, 50n]);
      expect(postings.map(({ credit }) => credit)).toEqual([0n, 300n, 0n]);
      expect(postings.map(({ balance }) => balance)).toEqual([1000n, 700n, 750n]);
    });

    test("keeps a running balance that grows with credits on an income account", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "SALE",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-04-01"),
        reference: "REFUND",
        debitAccountId: fixture.incomeId,
        creditAccountId: fixture.assetId,
        amount: 300n,
      });

      const postings = await ledgerOf({ accountId: fixture.incomeId, periodId: fixture.periodId });

      expect(postings.map(({ balance }) => balance)).toEqual([1000n, 700n]);
    });

    test("keeps the amounts of a foreign currency and converts them for the balance", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "EUR",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 10000n,
        currency: "EUR",
        exchangeRate: 0.5,
      });

      const [posting] = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(posting?.currency).toBe("EUR");
      expect(posting?.debit).toBe(10000n);
      expect(posting?.baseDebit).toBe(5000n);
      expect(posting?.baseCredit).toBe(0n);
      expect(posting?.balance).toBe(5000n);
    });

    test("ignores the postings of the other accounts", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "SALE",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });

      const postings = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(postings).toHaveLength(1);
      expect(postings[0]?.description).toBe("SALE debit");
    });

    test("ignores the postings of another period and restarts the balance", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "2026",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2027-03-01"),
        reference: "2027",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 200n,
      });

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.nextPeriodId,
      });

      expect(postings.map(({ reference }) => reference)).toEqual(["2027"]);
      expect(postings.map(({ balance }) => balance)).toEqual([200n]);
    });

    test("returns nothing for the account of another organization", async () => {
      const other = await seedOrganization();

      await book({
        organizationId: other.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "OTHER",
        debitAccountId: other.assetId,
        creditAccountId: other.incomeId,
        amount: 1000n,
      });

      const postings = await ledgerOf({ accountId: other.assetId, periodId: other.periodId });

      expect(postings).toEqual([]);
    });
  });

  describe("filters", () => {
    test("keeps the running balance of the whole period when filtering by reference", async () => {
      await bookThree();

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        filters: { reference: "again" },
      });

      expect(postings.map(({ reference }) => reference)).toEqual(["IN AGAIN"]);
      expect(postings.map(({ balance }) => balance)).toEqual([750n]);
    });

    test("filters by valid date range", async () => {
      await bookThree();

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        filters: { validOnFrom: new Date("2026-04-01"), validOnTo: new Date("2026-04-30") },
      });

      expect(postings.map(({ reference }) => reference)).toEqual(["OUT"]);
      expect(postings.map(({ balance }) => balance)).toEqual([700n]);
    });

    test("filters by journal entry number", async () => {
      await bookThree();

      const all = await ledgerOf({ accountId: fixture.assetId, periodId: fixture.periodId });
      const [, second] = all;
      assertNonNullish(second);

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        filters: { number: second.number },
      });

      expect(postings.map(({ postingId }) => postingId)).toEqual([second.postingId]);
    });
  });

  describe("sort and pagination", () => {
    test("sorts by date descending and keeps the chronological balance", async () => {
      await bookThree();

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        sort: { field: "validOn", direction: "desc" },
      });

      expect(postings.map(({ reference }) => reference)).toEqual(["IN AGAIN", "OUT", "IN"]);
      expect(postings.map(({ balance }) => balance)).toEqual([750n, 700n, 1000n]);
    });

    test("sorts by another column", async () => {
      await bookThree();

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        sort: { field: "balance", direction: "asc" },
      });

      expect(postings.map(({ balance }) => balance)).toEqual([700n, 750n, 1000n]);
    });

    test("paginates and keeps the balance of the whole period", async () => {
      await bookThree();

      const postings = await ledgerOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        pagination: { limit: 1, offset: 1 },
      });

      expect(postings.map(({ reference }) => reference)).toEqual(["OUT"]);
      expect(postings.map(({ balance }) => balance)).toEqual([700n]);
    });
  });

  describe("totalAccountLedger", () => {
    test("returns zero totals and no balance for an account without postings", async () => {
      const totals = await totalsOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(totals).toEqual({ baseDebit: 0n, baseCredit: 0n, balance: null });
    });

    test("sums the postings of the period and returns the latest balance", async () => {
      await bookThree();

      const totals = await totalsOf({ accountId: fixture.assetId, periodId: fixture.periodId });

      expect(totals).toEqual({ baseDebit: 1050n, baseCredit: 300n, balance: 750n });
    });

    test("sums the filtered postings and returns the balance after the latest of them", async () => {
      await bookThree();

      const totals = await totalsOf({
        accountId: fixture.assetId,
        periodId: fixture.periodId,
        filters: { validOnTo: new Date("2026-04-30") },
      });

      expect(totals).toEqual({ baseDebit: 1000n, baseCredit: 300n, balance: 700n });
    });
  });
});
