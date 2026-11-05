import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  PeriodJournalEntryType,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionJournal } from "../../../../src/ledger/composites/journal";
import { CompanyClosing } from "../../../../src/ledger/services/periods/_closing.company";
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

describe("CompanyClosing", () => {
  let organizationId: string;
  let period: Period;
  let nextPeriod: Period;
  let assetId: string;
  let incomeId: string;
  let expenseId: string;
  let annualProfitId: string;
  let annualResultId: string;

  const bookClosing = () =>
    db.transaction((tx) =>
      CompanyClosing.create({ organizationId, period, nextPeriod }).book({ tx }),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);

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
    expenseId = await leafAccountId(db, organizationId, AccountType.EXPENSE);

    annualProfitId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.ANNUAL_PROFIT,
    });
    annualResultId = await getSystemAccountId({
      organizationId,
      purpose: SystemAccountPurpose.ANNUAL_RESULT,
    });
  });

  test("books the result to the annual result account on the last day of the period", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });
    await book({
      organizationId,
      debitAccountId: expenseId,
      creditAccountId: assetId,
      amount: 400n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: annualProfitId, debit: 600n, credit: 0n });
    expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 600n });
  });

  test("books a loss the other way round", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 400n,
    });
    await book({
      organizationId,
      debitAccountId: expenseId,
      creditAccountId: assetId,
      amount: 1000n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: annualProfitId, debit: 0n, credit: 600n });
    expect(rows).toContainEqual({ accountId: annualResultId, debit: 600n, credit: 0n });
  });

  test("links the result entry to the period and the opening entry to the next period", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });

    await bookClosing();

    const links = await listPeriodLinks(organizationId);

    expect(links).toHaveLength(2);
    expect(links).toContainEqual({
      periodId: period.id,
      type: PeriodJournalEntryType.RESULT,
      validOn: PERIOD_END,
    });
    expect(links).toContainEqual({
      periodId: nextPeriod.id,
      type: PeriodJournalEntryType.OPENING,
      validOn: NEXT_PERIOD_START,
    });
  });

  test("opens the next period with the annual result on its own account", async () => {
    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: incomeId,
      amount: 1000n,
    });
    await book({
      organizationId,
      debitAccountId: expenseId,
      creditAccountId: assetId,
      amount: 400n,
    });

    await bookClosing();

    const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ accountId: assetId, debit: 600n, credit: 0n });
    expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 600n });
  });

  test("books nothing when the period has no entries", async () => {
    await bookClosing();

    expect(await listPeriodLinks(organizationId)).toHaveLength(0);
  });

  test("rejects when no annual result system account is bound", async () => {
    await db
      .delete(systemAccounts)
      .where(
        and(
          eq(systemAccounts.organizationId, organizationId),
          eq(systemAccounts.purpose, SystemAccountPurpose.ANNUAL_RESULT),
        ),
      );

    await expect(bookClosing()).rejects.toThrow("No annual_result system account defined");
  });

  test("rejects when the closing accounts carry a balance", async () => {
    const closingId = await leafAccountId(db, organizationId, AccountType.CLOSING);

    await book({
      organizationId,
      debitAccountId: assetId,
      creditAccountId: closingId,
      amount: 500n,
    });

    await expect(bookClosing()).rejects.toThrow("does not balance");
  });
});
