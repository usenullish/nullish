import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  LegalForm,
  PeriodJournalEntryType,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionJournal } from "../../../../src/ledger/composites/journal";
import { SoleProprietorshipClosing } from "../../../../src/ledger/services/periods/_closing.sole-proprietorship";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../../_test-utils";

type Period = Records["Ledger"]["Periods"]["Select"];

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;

const PERIOD_END = new Date("2026-12-31");
const NEXT_PERIOD_START = new Date("2027-01-01");

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const createPeriod = async ({
  organizationId,
  startOn,
  endOn,
}: {
  organizationId: string;
  startOn: Date;
  endOn: Date;
}): Promise<Period> => {
  const [period] = await db.insert(periods).values({ organizationId, startOn, endOn }).returning();
  assertNonNullish(period);

  return period;
};

const getSystemAccountId = async ({
  organizationId,
  purpose,
}: {
  organizationId: string;
  purpose: SystemAccountPurpose;
}): Promise<string> => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    );
  assertNonNullish(row);

  return row.accountId;
};

const book = async ({
  organizationId,
  debitAccountId,
  creditAccountId,
  amount,
}: {
  organizationId: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
}): Promise<void> => {
  const journal = await DbCollectionJournal.create({
    db,
    userId: TEST_USER_ID,
    foreignKeyId: organizationId,
  }).insert({
    values: {
      entry: { validOn: new Date("2026-06-15"), reference: "TEST-JOURNAL" },
      postings: [
        {
          accountId: debitAccountId,
          description: null,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: creditAccountId,
          description: null,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
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

const listPostingsOn = ({ organizationId, validOn }: { organizationId: string; validOn: Date }) =>
  db
    .select({ accountId: postings.accountId, debit: postings.debit, credit: postings.credit })
    .from(postings)
    .innerJoin(journalEntries, eq(journalEntries.id, postings.journalEntryId))
    .where(
      and(eq(journalEntries.organizationId, organizationId), eq(journalEntries.validOn, validOn)),
    );

const listPeriodLinks = (organizationId: string) =>
  db
    .select({
      periodId: periodJournalEntries.periodId,
      type: periodJournalEntries.type,
      validOn: journalEntries.validOn,
    })
    .from(periodJournalEntries)
    .innerJoin(journalEntries, eq(journalEntries.id, periodJournalEntries.journalEntryId))
    .where(eq(journalEntries.organizationId, organizationId));

describe("SoleProprietorshipClosing", () => {
  let organizationId: string;
  let period: Period;
  let nextPeriod: Period;
  let assetId: string;
  let incomeId: string;
  let annualProfitId: string;
  let annualResultId: string;
  let capitalId: string;
  let contributionsId: string;
  let privateId: string;

  const bookClosing = () =>
    db.transaction((tx) =>
      SoleProprietorshipClosing.create({ organizationId, period, nextPeriod }).book({ tx }),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID, {
      legalForm: LegalForm.SOLE_PROPRIETORSHIP,
    });

    period = await createPeriod({
      organizationId,
      startOn: new Date("2026-01-01"),
      endOn: PERIOD_END,
    });
    nextPeriod = await createPeriod({
      organizationId,
      startOn: NEXT_PERIOD_START,
      endOn: new Date("2027-12-31"),
    });

    assetId = await leafAccountId(db, organizationId, AccountType.ASSET);
    incomeId = await leafAccountId(db, organizationId, AccountType.INCOME);

    annualProfitId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.ANNUAL_PROFIT,
    });
    annualResultId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.ANNUAL_RESULT,
    });
    capitalId = await getSystemAccountId({ organizationId, purpose: SystemAccountPurpose.CAPITAL });
    contributionsId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.CAPITAL_CONTRIBUTIONS,
    });
    privateId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.PRIVATE_ACCOUNT,
    });
  });

  test("books the result and the transfers into the capital in one entry on the last day of the period", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });
    await book({
      organizationId,
      debitAccountId: privateId,
      creditAccountId: assetId,
      amount: 300n,
    });
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: contributionsId,
      amount: 500n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });
    const links = await listPeriodLinks(organizationId);

    expect(rows).toHaveLength(5);
    expect(rows).toContainEqual({ accountId: annualProfitId, debit: 1000n, credit: 0n });
    expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 1000n });
    expect(rows).toContainEqual({ accountId: privateId, debit: 0n, credit: 300n });
    expect(rows).toContainEqual({ accountId: contributionsId, debit: 500n, credit: 0n });
    expect(rows).toContainEqual({ accountId: capitalId, debit: 0n, credit: 200n });
    expect(links.filter(({ validOn }) => validOn.getTime() === PERIOD_END.getTime())).toEqual([
      { periodId: period.id, type: PeriodJournalEntryType.RESULT, validOn: PERIOD_END },
    ]);
  });

  test("books the transfers into the capital when the period has no result", async () => {
    await book({
      organizationId,
      debitAccountId: privateId,
      creditAccountId: assetId,
      amount: 300n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: privateId, debit: 0n, credit: 300n });
    expect(rows).toContainEqual({ accountId: capitalId, debit: 300n, credit: 0n });
  });

  test("books no capital posting when the contributions equal the withdrawals", async () => {
    await book({
      organizationId,
      debitAccountId: privateId,
      creditAccountId: assetId,
      amount: 300n,
    });
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: contributionsId,
      amount: 300n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: privateId, debit: 0n, credit: 300n });
    expect(rows).toContainEqual({ accountId: contributionsId, debit: 300n, credit: 0n });
  });

  test("books nothing on the last day of the period without a result nor a transfer", async () => {
    await bookClosing();

    expect(await listPostingsOn({ organizationId, validOn: PERIOD_END })).toHaveLength(0);
  });

  test("opens the next period with the owner's equity on the capital", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });
    await book({
      organizationId,
      debitAccountId: privateId,
      creditAccountId: assetId,
      amount: 300n,
    });
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: contributionsId,
      amount: 500n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: assetId, debit: 1200n, credit: 0n });
    expect(rows).toContainEqual({ accountId: capitalId, debit: 0n, credit: 1200n });
  });

  test("carries neither the annual result, the private account nor the contributions into the next period", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });
    await book({
      organizationId,
      debitAccountId: privateId,
      creditAccountId: assetId,
      amount: 300n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });
    const accountIds = rows.map(({ accountId }) => accountId);

    expect(accountIds).not.toContain(annualResultId);
    expect(accountIds).not.toContain(privateId);
    expect(accountIds).not.toContain(contributionsId);
  });

  test.each([
    SystemAccountPurpose.CAPITAL,
    SystemAccountPurpose.CAPITAL_CONTRIBUTIONS,
    SystemAccountPurpose.PRIVATE_ACCOUNT,
  ])("rejects when no %s system account is bound", async (purpose) => {
    await db
      .delete(systemAccounts)
      .where(
        and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
      );

    await expect(bookClosing()).rejects.toThrow(`No ${purpose} system account defined`);
  });
});
