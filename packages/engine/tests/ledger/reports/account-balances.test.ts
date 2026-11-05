import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { AccountBalancesReport } from "../../../src/ledger/reports/account-balances";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import type { DbLedgerReportsArgs } from "../../../src/ledger/reports/_ledger-reports";
import type { DbCollectionStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import {
  ancestorAccountIds,
  createOrganization,
  leafAccountId,
  readAccountBalance,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  waitFor,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const currencies = DbSchema.Core.Currencies.CurrenciesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const postEntry = async (args: {
  organizationId: string;
  userId: DbCollectionStoreInitArgs<string>["userId"];
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
  validOn?: Date;
}): Promise<void> => {
  const store = DbCollectionJournal.create({
    db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: args.userId,
    foreignKeyId: args.organizationId,
  });

  const result = await store.insert({
    values: {
      entry: { validOn: args.validOn ?? new Date("2026-06-15"), reference: "TEST-ENTRY" },
      postings: [
        {
          accountId: args.debitAccountId,
          description: "Debit side",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: args.amount,
          credit: 0n,
        },
        {
          accountId: args.creditAccountId,
          description: "Credit side",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 0n,
          credit: args.amount,
        },
      ],
    },
  });

  if (result.status === "error") {
    throw result.err;
  }

  await waitFor(
    () => readAccountBalance(db, args.debitAccountId),
    (balance) => balance?.totalDebit === args.amount,
  );
};

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";

describe("account-balances", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let assetAccountId: string;
  let incomeAccountId: string;
  let siblingAssetAccountId: string;
  let otherAssetAccountId: string;
  let periodId: string;
  let siblingPeriodId: string;
  let otherPeriodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    const [period, siblingPeriod, otherPeriod] = await db
      .insert(periods)
      .values([
        { organizationId: orgId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") },
        {
          organizationId: siblingOrgId,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
        },
        {
          organizationId: otherOrgId,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
        },
      ])
      .returning({ id: periods.id });
    assertNonNullish(period);
    assertNonNullish(siblingPeriod);
    assertNonNullish(otherPeriod);
    periodId = period.id;
    siblingPeriodId = siblingPeriod.id;
    otherPeriodId = otherPeriod.id;

    assetAccountId = await leafAccountId(db, orgId, AccountType.ASSET);
    incomeAccountId = await leafAccountId(db, orgId, AccountType.INCOME);
    siblingAssetAccountId = await leafAccountId(db, siblingOrgId, AccountType.ASSET);
    const siblingIncomeAccountId = await leafAccountId(db, siblingOrgId, AccountType.INCOME);
    otherAssetAccountId = await leafAccountId(db, otherOrgId, AccountType.ASSET);
    const otherIncomeAccountId = await leafAccountId(db, otherOrgId, AccountType.INCOME);

    await postEntry({
      organizationId: orgId,
      userId: TEST_USER_ID,
      debitAccountId: assetAccountId,
      creditAccountId: incomeAccountId,
      amount: 10000n,
    });
    await postEntry({
      organizationId: siblingOrgId,
      userId: TEST_USER_ID,
      debitAccountId: siblingAssetAccountId,
      creditAccountId: siblingIncomeAccountId,
      amount: 5000n,
    });
    await postEntry({
      organizationId: otherOrgId,
      userId: TEST_OTHER_USER_ID,
      debitAccountId: otherAssetAccountId,
      creditAccountId: otherIncomeAccountId,
      amount: 7000n,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns the posted account balances for the configured organization", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId: periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const expectedAccountIds = [
      ...(await ancestorAccountIds(db, orgId, assetAccountId)),
      ...(await ancestorAccountIds(db, orgId, incomeAccountId)),
    ];

    expect(result.result.map((row) => row.accountId).sort()).toEqual(expectedAccountIds.sort());
  });

  test("computes totalDebit, totalCredit and balance as bigint", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId: periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const asset = result.result.find((row) => row.accountId === assetAccountId);
    expect(asset?.totalDebit).toBe(10000n);
    expect(asset?.totalCredit).toBe(0n);
    expect(asset?.balance).toBe(10000n);

    const income = result.result.find((row) => row.accountId === incomeAccountId);
    expect(income?.totalDebit).toBe(0n);
    expect(income?.totalCredit).toBe(10000n);
    expect(income?.balance).toBe(10000n);
  });

  test("orders rows by account code ascending", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId: periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const codes = result.result.map((row) => row.code);
    expect(codes).toEqual([...codes].sort());
  });

  test("does not leak balances from a sibling organization the caller also belongs to", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: siblingOrgId,
    }).list({ periodId: siblingPeriodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const accountIds = result.result.map((row) => row.accountId);
    expect(accountIds).toContain(siblingAssetAccountId);
    expect(accountIds).not.toContain(assetAccountId);
  });

  test("returns an empty result when the caller is not a member of the organization", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: otherOrgId,
    }).list({ periodId: otherPeriodId });

    expect(result).toEqual({ status: "success", result: [] });
  });

  test("returns an error Result when the transaction cannot be opened", async () => {
    const result = await AccountBalancesReport.create({
      db: drizzle({ client: new BunSQL(UNREACHABLE_URL) }) as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId: periodId });

    expect(result.status).toBe("error");
  });

  test("converts a foreign-currency posting to the base currency using its own exchange rate", async () => {
    const store = DbCollectionJournal.create({
      db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    const inserted = await store.insert({
      values: {
        entry: { validOn: new Date("2026-06-15"), reference: "TEST-FX-ENTRY" },
        postings: [
          {
            accountId: assetAccountId,
            description: "Foreign debit",
            currency: "USD",
            exchangeRate: 0.92345,
            vatRateId: null,
            debit: 1000n,
            credit: 0n,
          },
          {
            accountId: incomeAccountId,
            description: "Foreign credit",
            currency: "USD",
            exchangeRate: 0.92345,
            vatRateId: null,
            debit: 0n,
            credit: 1000n,
          },
        ],
      },
    });

    if (inserted.status === "error") {
      throw inserted.err;
    }

    await waitFor(
      () => readAccountBalance(db, assetAccountId),
      (balance) => balance?.totalDebit === 10923n,
    );

    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId: periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const asset = result.result.find((row) => row.accountId === assetAccountId);
    expect(asset?.totalDebit).toBe(10923n);
    expect(asset?.totalCredit).toBe(0n);
    expect(asset?.balance).toBe(10923n);

    const income = result.result.find((row) => row.accountId === incomeAccountId);
    expect(income?.totalDebit).toBe(0n);
    expect(income?.totalCredit).toBe(10923n);
    expect(income?.balance).toBe(10923n);
  });

  test("returns the time the balances were computed", async () => {
    const result = await AccountBalancesReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.every(({ computedAt }) => computedAt instanceof Date)).toBeTrue();
  });

  describe("across periods", () => {
    let periodsOrgId: string;
    let firstPeriodId: string;
    let secondPeriodId: string;
    let periodsAssetAccountId: string;
    let periodsIncomeAccountId: string;
    let periodsLiabilityAccountId: string;

    beforeAll(async () => {
      periodsOrgId = await createOrganization(db, TEST_USER_ID);

      const [firstPeriod, secondPeriod] = await db
        .insert(periods)
        .values([
          {
            organizationId: periodsOrgId,
            startOn: new Date("2026-01-01"),
            endOn: new Date("2026-12-31"),
          },
          {
            organizationId: periodsOrgId,
            startOn: new Date("2027-01-01"),
            endOn: new Date("2027-12-31"),
          },
        ])
        .returning({ id: periods.id });
      assertNonNullish(firstPeriod);
      assertNonNullish(secondPeriod);
      firstPeriodId = firstPeriod.id;
      secondPeriodId = secondPeriod.id;

      periodsAssetAccountId = await leafAccountId(db, periodsOrgId, AccountType.ASSET);
      periodsIncomeAccountId = await leafAccountId(db, periodsOrgId, AccountType.INCOME);
      periodsLiabilityAccountId = await leafAccountId(db, periodsOrgId, AccountType.LIABILITY);

      await postEntry({
        organizationId: periodsOrgId,
        userId: TEST_USER_ID,
        debitAccountId: periodsAssetAccountId,
        creditAccountId: periodsIncomeAccountId,
        amount: 1000n,
        validOn: new Date("2026-06-15"),
      });
      await postEntry({
        organizationId: periodsOrgId,
        userId: TEST_USER_ID,
        debitAccountId: periodsAssetAccountId,
        creditAccountId: periodsLiabilityAccountId,
        amount: 400n,
        validOn: new Date("2027-03-01"),
      });
    });

    const listFor = (periodId: string) =>
      AccountBalancesReport.create({
        db: db as unknown as DbLedgerReportsArgs["db"],
        userId: TEST_USER_ID,
        organizationId: periodsOrgId,
      }).list({ periodId });

    test("limits the period balance to the postings dated within the period", async () => {
      const result = await listFor(secondPeriodId);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const asset = result.result.find((row) => row.accountId === periodsAssetAccountId);
      expect(asset?.totalDebit).toBe(400n);
      expect(asset?.balance).toBe(400n);
    });

    test("excludes an account without activity in the period", async () => {
      const result = await listFor(secondPeriodId);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((row) => row.accountId)).not.toContain(periodsIncomeAccountId);
    });

    test("ignores the postings of the following periods", async () => {
      const result = await listFor(firstPeriodId);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const asset = result.result.find((row) => row.accountId === periodsAssetAccountId);
      expect(asset?.balance).toBe(1000n);

      expect(result.result.map((row) => row.accountId)).not.toContain(periodsLiabilityAccountId);
    });
  });

  describe("posting in a currency without decimals", () => {
    let foreignOrgId: string;
    let foreignAssetAccountId: string;
    let foreignIncomeAccountId: string;

    beforeAll(async () => {
      await db.insert(currencies).values({ code: "JPY", decimals: 0 }).onConflictDoNothing();

      foreignOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: foreignOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      foreignAssetAccountId = await leafAccountId(db, foreignOrgId, AccountType.ASSET);
      foreignIncomeAccountId = await leafAccountId(db, foreignOrgId, AccountType.INCOME);

      const result = await DbCollectionJournal.create({
        db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
        userId: TEST_USER_ID,
        foreignKeyId: foreignOrgId,
      }).insert({
        values: {
          entry: { validOn: new Date("2026-06-15"), reference: "TEST-JPY" },
          postings: [
            {
              accountId: foreignAssetAccountId,
              description: "Debit side",
              currency: "JPY",
              exchangeRate: 0.0055,
              vatRateId: null,
              debit: 1000n,
              credit: 0n,
            },
            {
              accountId: foreignIncomeAccountId,
              description: "Credit side",
              currency: "CHF",
              exchangeRate: 1,
              vatRateId: null,
              debit: 0n,
              credit: 550n,
            },
          ],
        },
      });

      if (result.status === "error") {
        throw result.err;
      }

      await waitFor(
        () => readAccountBalance(db, foreignIncomeAccountId),
        (balance) => balance?.totalCredit === 550n,
      );
    });

    test("converts the amount to the smallest unit of the base currency", async () => {
      const balance = await readAccountBalance(db, foreignAssetAccountId);

      expect(balance?.totalDebit).toBe(550n);
      expect(balance?.balance).toBe(550n);
    });
  });

  describe("posting in a currency with eighteen decimals", () => {
    const AMOUNT = 1234567890123456789n;

    let foreignOrgId: string;
    let foreignAssetAccountId: string;
    let foreignIncomeAccountId: string;

    beforeAll(async () => {
      await db.insert(currencies).values({ code: "ETH", decimals: 18 }).onConflictDoNothing();

      foreignOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: foreignOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      foreignAssetAccountId = await leafAccountId(db, foreignOrgId, AccountType.ASSET);
      foreignIncomeAccountId = await leafAccountId(db, foreignOrgId, AccountType.INCOME);

      const result = await DbCollectionJournal.create({
        db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
        userId: TEST_USER_ID,
        foreignKeyId: foreignOrgId,
      }).insert({
        values: {
          entry: { validOn: new Date("2026-06-15"), reference: "TEST-ETH" },
          postings: [
            {
              accountId: foreignAssetAccountId,
              description: "Debit side",
              currency: "ETH",
              exchangeRate: 3012.45,
              vatRateId: null,
              debit: AMOUNT,
              credit: 0n,
            },
            {
              accountId: foreignIncomeAccountId,
              description: "Credit side",
              currency: "ETH",
              exchangeRate: 3012.45,
              vatRateId: null,
              debit: 0n,
              credit: AMOUNT,
            },
          ],
        },
      });

      if (result.status === "error") {
        throw result.err;
      }

      await waitFor(
        () => readAccountBalance(db, foreignIncomeAccountId),
        (balance) => nonNullish(balance),
      );
    });

    test("converts every digit of the amount and rounds once to the smallest unit of the base currency", async () => {
      const balance = await readAccountBalance(db, foreignAssetAccountId);

      expect(balance?.totalDebit).toBe(371907n);
      expect(balance?.balance).toBe(371907n);
    });
  });
});
