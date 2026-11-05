import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import { listActiveAccountIds } from "../../../src/ledger/_helpers/active-accounts";
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

describe("ledger/_helpers/active-accounts", () => {
  let fixture: Fixture;

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

  describe("listActiveAccountIds", () => {
    const accountIdsOf = (periodId: string) =>
      db.transaction((tx) =>
        listActiveAccountIds({ tx, organizationId: fixture.organizationId, periodId }),
      );

    test("returns nothing for a period without postings", async () => {
      const accountIds = await accountIdsOf(fixture.periodId);

      expect(accountIds).toEqual([]);
    });

    test("returns each account with postings in the period once", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "FIRST",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-04-01"),
        reference: "SECOND",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 500n,
      });

      const accountIds = await accountIdsOf(fixture.periodId);

      expect(accountIds.toSorted()).toEqual([fixture.assetId, fixture.incomeId].toSorted());
    });

    test("orders the accounts by code", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "SALE",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });

      const accountIds = await accountIdsOf(fixture.periodId);

      expect(accountIds).toEqual([fixture.assetId, fixture.incomeId]);
    });

    test("ignores the accounts with postings in another period only", async () => {
      await book({
        organizationId: fixture.organizationId,
        validOn: new Date("2027-03-01"),
        reference: "2027",
        debitAccountId: fixture.assetId,
        creditAccountId: fixture.incomeId,
        amount: 1000n,
      });

      const accountIds = await accountIdsOf(fixture.periodId);

      expect(accountIds).toEqual([]);
    });

    test("ignores the accounts of another organization", async () => {
      const other = await seedOrganization();

      await book({
        organizationId: other.organizationId,
        validOn: new Date("2026-03-01"),
        reference: "OTHER",
        debitAccountId: other.assetId,
        creditAccountId: other.incomeId,
        amount: 1000n,
      });

      const accountIds = await accountIdsOf(other.periodId);

      expect(accountIds).toEqual([]);
    });
  });
});
