import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { BalanceSheetReport } from "../../../src/ledger/reports/balance-sheet";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import type { DbLedgerReportsArgs } from "../../../src/ledger/reports/_ledger-reports";
import type { DbCollectionStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  ancestorAccountIds,
  createOrganization,
  leafAccountId,
  readAccountBalance,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  waitFor,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const otherLeafAccountId = async (
  organizationId: string,
  type: string,
  excludeId: string,
): Promise<string | undefined> => {
  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));

  const parentIds = new Set(
    rows.map((row) => row.parentId).filter((value): value is string => value !== null),
  );

  return rows.find((row) => row.type === type && row.id !== excludeId && !parentIds.has(row.id))
    ?.id;
};

const postEntry = async (args: {
  organizationId: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
  validOn?: Date;
}): Promise<void> => {
  const store = DbCollectionJournal.create({
    db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: TEST_USER_ID,
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

describe("balance-sheet", () => {
  let orgId: string;
  let siblingOrgId: string;
  let periodId: string;
  let siblingPeriodId: string;
  let assetAccountId: string;
  let liabilityAccountId: string;
  let unpostedAssetAccountId: string;
  let siblingAssetAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);

    const [period, siblingPeriod] = await db
      .insert(periods)
      .values([
        { organizationId: orgId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") },
        {
          organizationId: siblingOrgId,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
        },
      ])
      .returning({ id: periods.id });
    assertNonNullish(period);
    assertNonNullish(siblingPeriod);
    periodId = period.id;
    siblingPeriodId = siblingPeriod.id;

    assetAccountId = await leafAccountId(db, orgId, AccountType.ASSET);
    liabilityAccountId = await leafAccountId(db, orgId, AccountType.LIABILITY);
    const incomeAccountId = await leafAccountId(db, orgId, AccountType.INCOME);
    const expenseAccountId = await leafAccountId(db, orgId, AccountType.EXPENSE);
    siblingAssetAccountId = await leafAccountId(db, siblingOrgId, AccountType.ASSET);
    const siblingLiabilityAccountId = await leafAccountId(db, siblingOrgId, AccountType.LIABILITY);

    const unposted = await otherLeafAccountId(orgId, AccountType.ASSET, assetAccountId);
    assertNonNullish(unposted);
    unpostedAssetAccountId = unposted;

    await postEntry({
      organizationId: orgId,
      debitAccountId: assetAccountId,
      creditAccountId: liabilityAccountId,
      amount: 10000n,
    });
    await postEntry({
      organizationId: orgId,
      debitAccountId: expenseAccountId,
      creditAccountId: incomeAccountId,
      amount: 3000n,
    });
    await postEntry({
      organizationId: siblingOrgId,
      debitAccountId: siblingAssetAccountId,
      creditAccountId: siblingLiabilityAccountId,
      amount: 4000n,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("includes only balance-sheet account types (asset, liability, equity)", async () => {
    const result = await BalanceSheetReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const expectedAccountIds = [
      ...(await ancestorAccountIds(db, orgId, assetAccountId)),
      ...(await ancestorAccountIds(db, orgId, liabilityAccountId)),
    ];

    expect(result.result.map((row) => row.accountId).sort()).toEqual(expectedAccountIds.sort());
    expect(result.result.every((row) => row.type !== AccountType.INCOME)).toBeTrue();
    expect(result.result.every((row) => row.type !== AccountType.EXPENSE)).toBeTrue();
  });

  test("excludes accounts with a zero balance", async () => {
    const result = await BalanceSheetReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.map((row) => row.accountId)).not.toContain(unpostedAssetAccountId);
  });

  test("orders rows by account code ascending", async () => {
    const result = await BalanceSheetReport.create({
      db: db as unknown as DbLedgerReportsArgs["db"],
      userId: TEST_USER_ID,
      organizationId: orgId,
    }).list({ periodId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const codes = result.result.map((row) => row.code);
    expect(codes).toEqual([...codes].sort());
  });

  test("scopes rows to the configured organization", async () => {
    const result = await BalanceSheetReport.create({
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
  describe("across periods", () => {
    let periodsOrgId: string;
    let secondPeriodId: string;
    let previousAccountId: string;

    beforeAll(async () => {
      periodsOrgId = await createOrganization(db, TEST_USER_ID);

      const [, secondPeriod] = await db
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
      assertNonNullish(secondPeriod);
      secondPeriodId = secondPeriod.id;

      const assetAccountId = await leafAccountId(db, periodsOrgId, AccountType.ASSET);
      const incomeAccountId = await leafAccountId(db, periodsOrgId, AccountType.INCOME);
      previousAccountId = assetAccountId;

      await postEntry({
        organizationId: periodsOrgId,
        debitAccountId: assetAccountId,
        creditAccountId: incomeAccountId,
        amount: 1000n,
        validOn: new Date("2026-06-15"),
      });
    });

    test("excludes an account without activity in the period", async () => {
      const result = await BalanceSheetReport.create({
        db: db as unknown as DbLedgerReportsArgs["db"],
        userId: TEST_USER_ID,
        organizationId: periodsOrgId,
      }).list({ periodId: secondPeriodId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((row) => row.accountId)).not.toContain(previousAccountId);
    });
  });
});
