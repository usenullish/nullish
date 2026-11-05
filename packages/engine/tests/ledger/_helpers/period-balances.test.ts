import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import { listPeriodBalances } from "../../../src/ledger/_helpers/period-balances";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const PERIOD = { startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") };
const NEXT_PERIOD = { startOn: new Date("2027-01-01"), endOn: new Date("2027-12-31") };

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const book = async ({
  organizationId,
  validOn,
  debitAccountId,
  creditAccountId,
  amount,
  currency,
  exchangeRate,
}: {
  organizationId: string;
  validOn: Date;
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
  currency: string;
  exchangeRate: number;
}): Promise<void> => {
  const journal = await DbCollectionJournal.create({
    db,
    userId: TEST_USER_ID,
    foreignKeyId: organizationId,
  }).insert({
    values: {
      entry: { validOn, reference: "TEST-JOURNAL" },
      postings: [
        {
          accountId: debitAccountId,
          description: null,
          currency,
          exchangeRate,
          vatRateId: null,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: creditAccountId,
          description: null,
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

describe("ledger/_helpers/period-balances", () => {
  let orgId: string;
  let assetId: string;
  let incomeId: string;

  const seedOrganization = async (): Promise<{
    organizationId: string;
    assetId: string;
    incomeId: string;
  }> => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await db.insert(periods).values([
      { organizationId, ...PERIOD },
      { organizationId, ...NEXT_PERIOD },
    ]);

    return {
      organizationId,
      assetId: await leafAccountId(db, organizationId, AccountType.ASSET),
      incomeId: await leafAccountId(db, organizationId, AccountType.INCOME),
    };
  };

  const balancesOf = (organizationId: string) =>
    db.transaction((tx) => listPeriodBalances({ tx, organizationId, ...PERIOD }));

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    ({ organizationId: orgId, assetId, incomeId } = await seedOrganization());
  });

  describe("listPeriodBalances", () => {
    test("returns nothing for a period without entries", async () => {
      const balances = await balancesOf(orgId);

      expect(balances).toEqual([]);
    });

    test("totals the debits and the credits of each account", async () => {
      await book({
        organizationId: orgId,
        validOn: new Date("2026-03-01"),
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });
      await book({
        organizationId: orgId,
        validOn: new Date("2026-09-01"),
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 500n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });
      await book({
        organizationId: orgId,
        validOn: new Date("2026-10-01"),
        debitAccountId: incomeId,
        creditAccountId: assetId,
        amount: 200n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });

      const balances = await balancesOf(orgId);

      const asset = balances.find(({ accountId }) => accountId === assetId);
      const income = balances.find(({ accountId }) => accountId === incomeId);

      expect(balances).toHaveLength(2);
      expect(asset?.debit).toBe(1500n);
      expect(asset?.credit).toBe(200n);
      expect(income?.debit).toBe(200n);
      expect(income?.credit).toBe(1500n);
    });

    test("returns the type of each account", async () => {
      await book({
        organizationId: orgId,
        validOn: new Date("2026-03-01"),
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });

      const balances = await balancesOf(orgId);

      expect(balances.find(({ accountId }) => accountId === assetId)?.type).toBe(AccountType.ASSET);
      expect(balances.find(({ accountId }) => accountId === incomeId)?.type).toBe(
        AccountType.INCOME,
      );
    });

    test("converts a foreign currency to the base currency", async () => {
      await book({
        organizationId: orgId,
        validOn: new Date("2026-03-01"),
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 10000n,
        currency: "EUR",
        exchangeRate: 0.5,
      });

      const balances = await balancesOf(orgId);
      const asset = balances.find(({ accountId }) => accountId === assetId);

      expect(asset?.debit).toBe(5000n);
      expect(asset?.credit).toBe(0n);
    });

    test("includes the entries dated on the first and the last day of the period", async () => {
      await book({
        organizationId: orgId,
        validOn: PERIOD.startOn,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 100n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });
      await book({
        organizationId: orgId,
        validOn: PERIOD.endOn,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 10n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });

      const balances = await balancesOf(orgId);
      const asset = balances.find(({ accountId }) => accountId === assetId);

      expect(asset?.debit).toBe(110n);
    });

    test("ignores the entries dated outside the period", async () => {
      await book({
        organizationId: orgId,
        validOn: NEXT_PERIOD.startOn,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });

      const balances = await balancesOf(orgId);

      expect(balances).toEqual([]);
    });

    test("ignores the entries of another organization", async () => {
      const other = await seedOrganization();

      await book({
        organizationId: other.organizationId,
        validOn: new Date("2026-03-01"),
        debitAccountId: other.assetId,
        creditAccountId: other.incomeId,
        amount: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      });

      const balances = await balancesOf(orgId);

      expect(balances).toEqual([]);
    });
  });
});
