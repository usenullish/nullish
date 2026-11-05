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
  PeriodCloseMode,
  PeriodJournalEntryType,
  PeriodStatus,
  SystemAccountPurpose,
  VatPeriodStatus,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionJournal } from "../../../../src/ledger/composites/journal";
import { ClosePeriodService } from "../../../../src/ledger/services/periods/period.close";
import { EngineError } from "../../../../src/errors";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const vatPeriods = DbSchema.Core.Vat.VatPeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;

const PERIOD_START = new Date("2026-01-01");
const PERIOD_END = new Date("2026-12-31");
const NEXT_PERIOD_START = new Date("2027-01-01");
const NEXT_PERIOD_END = new Date("2027-12-31");

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
}): Promise<string> => {
  const [period] = await db.insert(periods).values({ organizationId, startOn, endOn }).returning();
  assertNonNullish(period);

  return period.id;
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

const closeService = (periodId: string): ClosePeriodService =>
  ClosePeriodService.create({ db, userId: TEST_USER_ID, periodId });

describe("ClosePeriodService", () => {
  let organizationId: string;
  let periodId: string;
  let nextPeriodId: string;
  let assetId: string;
  let incomeId: string;
  let expenseId: string;
  let annualProfitId: string;
  let annualResultId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);

    periodId = await createPeriod({ organizationId, startOn: PERIOD_START, endOn: PERIOD_END });
    nextPeriodId = await createPeriod({
      organizationId,
      startOn: NEXT_PERIOD_START,
      endOn: NEXT_PERIOD_END,
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

  describe("close with the closing entries mode", () => {
    test("marks the period as closed", async () => {
      const result = await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      expect(result.status).toBe("success");

      const [period] = await db.select().from(periods).where(eq(periods.id, periodId));

      expect(period?.status).toBe(PeriodStatus.CLOSED);
    });

    test("books a profit to the annual result account on the last day of the period", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ accountId: annualProfitId, debit: 600n, credit: 0n });
      expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 600n });
    });

    test("links the result entry to the period and the opening entry to the next period", async () => {
      await book({
        organizationId,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const links = await listPeriodLinks(organizationId);

      expect(links).toHaveLength(2);
      expect(links).toContainEqual({
        periodId,
        type: PeriodJournalEntryType.RESULT,
        validOn: PERIOD_END,
      });
      expect(links).toContainEqual({
        periodId: nextPeriodId,
        type: PeriodJournalEntryType.OPENING,
        validOn: NEXT_PERIOD_START,
      });
    });

    test("leaves the closing entries without a reference and their postings without a description", async () => {
      await book({
        organizationId,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await db
        .select({ reference: journalEntries.reference, description: postings.description })
        .from(postings)
        .innerJoin(journalEntries, eq(journalEntries.id, postings.journalEntryId))
        .innerJoin(periodJournalEntries, eq(periodJournalEntries.journalEntryId, journalEntries.id))
        .where(eq(journalEntries.organizationId, organizationId));

      expect(rows).toHaveLength(4);
      expect(rows.every(({ reference }) => reference === null)).toBeTrue();
      expect(rows.every(({ description }) => description === null)).toBeTrue();
    });

    test("links nothing when the period has no entries", async () => {
      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const links = await listPeriodLinks(organizationId);

      expect(links).toHaveLength(0);
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ accountId: annualProfitId, debit: 0n, credit: 600n });
      expect(rows).toContainEqual({ accountId: annualResultId, debit: 600n, credit: 0n });
    });

    test("books no result when the income equals the expenses", async () => {
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
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

      expect(rows).toHaveLength(0);
    });

    test("opens the next period with the balances of the balance sheet accounts", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ accountId: assetId, debit: 600n, credit: 0n });
      expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 600n });
    });

    test("carries no income nor expense account into the next period", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });
      const accountIds = rows.map(({ accountId }) => accountId);

      expect(accountIds).not.toContain(incomeId);
      expect(accountIds).not.toContain(expenseId);
    });

    test("books nothing in the next period when the period has no entries", async () => {
      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

      expect(rows).toHaveLength(0);
    });

    describe("errors", () => {
      const expectRejected = async ({
        periodId,
        message,
      }: {
        periodId: string;
        message: string;
      }): Promise<void> => {
        const result = await closeService(periodId).close({
          mode: PeriodCloseMode.CLOSING_ENTRIES,
        });

        expect(result.status).toBe("error");

        if (result.status !== "error") {
          return;
        }

        expect(result.err).toBeInstanceOf(EngineError);
        expect(String(result.err)).toContain(message);
      };

      test("rejects a period that is already closed", async () => {
        await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

        await expectRejected({ periodId, message: "is closed and not open" });
      });

      test("rejects a period while a previous period is open", async () => {
        const [nextPeriod] = await db
          .select()
          .from(periods)
          .where(
            and(eq(periods.organizationId, organizationId), eq(periods.startOn, NEXT_PERIOD_START)),
          );
        assertNonNullish(nextPeriod);

        await createPeriod({
          organizationId,
          startOn: new Date("2028-01-01"),
          endOn: new Date("2028-12-31"),
        });

        await expectRejected({
          periodId: nextPeriod.id,
          message: "before the previous periods are closed",
        });
      });

      test("rejects a period while one of its VAT periods is open", async () => {
        await db.insert(vatPeriods).values({
          organizationId,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-03-31"),
          status: VatPeriodStatus.OPEN,
        });

        await expectRejected({ periodId, message: "before its VAT periods are closed" });
      });

      test("rejects a period that no period follows", async () => {
        const lonelyOrganizationId = await createOrganization(db, TEST_USER_ID);
        const lonelyPeriodId = await createPeriod({
          organizationId: lonelyOrganizationId,
          startOn: PERIOD_START,
          endOn: PERIOD_END,
        });

        await expectRejected({
          periodId: lonelyPeriodId,
          message: "before the next period is created",
        });
      });

      test("rejects a period when no annual result system account is bound", async () => {
        await db
          .delete(systemAccounts)
          .where(
            and(
              eq(systemAccounts.organizationId, organizationId),
              eq(systemAccounts.purpose, SystemAccountPurpose.ANNUAL_RESULT),
            ),
          );

        await expectRejected({ periodId, message: "No annual_result system account defined" });
      });

      test("rejects a period whose closing accounts carry a balance", async () => {
        const closingId = await leafAccountId(db, organizationId, AccountType.CLOSING);

        await book({
          organizationId,
          debitAccountId: assetId,
          creditAccountId: closingId,
          amount: 500n,
        });

        await expectRejected({ periodId, message: "does not balance" });
      });

      test("keeps the period open and books nothing when it rejects", async () => {
        const closingId = await leafAccountId(db, organizationId, AccountType.CLOSING);

        await book({
          organizationId,
          debitAccountId: assetId,
          creditAccountId: incomeId,
          amount: 1000n,
        });
        await book({
          organizationId,
          debitAccountId: assetId,
          creditAccountId: closingId,
          amount: 500n,
        });

        await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

        const [period] = await db.select().from(periods).where(eq(periods.id, periodId));
        const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

        expect(period?.status).toBe(PeriodStatus.OPEN);
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("close a sole proprietorship with the closing entries mode", () => {
    let capitalId: string;
    let contributionsId: string;
    let privateId: string;

    beforeEach(async () => {
      organizationId = await createOrganization(db, TEST_USER_ID, {
        legalForm: LegalForm.SOLE_PROPRIETORSHIP,
      });

      periodId = await createPeriod({ organizationId, startOn: PERIOD_START, endOn: PERIOD_END });
      nextPeriodId = await createPeriod({
        organizationId,
        startOn: NEXT_PERIOD_START,
        endOn: NEXT_PERIOD_END,
      });

      assetId = await leafAccountId(db, organizationId, AccountType.ASSET);
      incomeId = await leafAccountId(db, organizationId, AccountType.INCOME);

      annualResultId = await getSystemAccountId({
        organizationId,
        purpose: SystemAccountPurpose.ANNUAL_RESULT,
      });
      capitalId = await getSystemAccountId({
        organizationId,
        purpose: SystemAccountPurpose.CAPITAL,
      });
      contributionsId = await getSystemAccountId({
        organizationId,
        purpose: SystemAccountPurpose.CAPITAL_CONTRIBUTIONS,
      });
      privateId = await getSystemAccountId({
        organizationId,
        purpose: SystemAccountPurpose.PRIVATE_ACCOUNT,
      });
    });

    test("moves the private account and the contributions into the capital on the last day of the period", async () => {
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
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });

      expect(rows).toHaveLength(3);
      expect(rows).toContainEqual({ accountId: privateId, debit: 0n, credit: 300n });
      expect(rows).toContainEqual({ accountId: contributionsId, debit: 1000n, credit: 0n });
      expect(rows).toContainEqual({ accountId: capitalId, debit: 0n, credit: 700n });
    });

    test("books the result and the private account in the same entry on the last day of the period", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: PERIOD_END });
      const links = await listPeriodLinks(organizationId);

      expect(rows).toHaveLength(4);
      expect(rows).toContainEqual({ accountId: annualResultId, debit: 0n, credit: 1000n });
      expect(rows).toContainEqual({ accountId: privateId, debit: 0n, credit: 300n });
      expect(rows).toContainEqual({ accountId: capitalId, debit: 300n, credit: 0n });
      expect(links).toHaveLength(2);
      expect(links).toContainEqual({
        periodId,
        type: PeriodJournalEntryType.RESULT,
        validOn: PERIOD_END,
      });
    });

    test("opens the next period with the private account and the contributions on the capital", async () => {
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
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ accountId: assetId, debit: 700n, credit: 0n });
      expect(rows).toContainEqual({ accountId: capitalId, debit: 0n, credit: 700n });
    });

    test("opens the next period with the annual result and the private account on the capital", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ accountId: assetId, debit: 700n, credit: 0n });
      expect(rows).toContainEqual({ accountId: capitalId, debit: 0n, credit: 700n });
    });

    test("carries neither the annual result nor the private account into the next period", async () => {
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

      await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      const rows = await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START });
      const accountIds = rows.map(({ accountId }) => accountId);

      expect(accountIds).not.toContain(annualResultId);
      expect(accountIds).not.toContain(privateId);
      expect(accountIds).not.toContain(contributionsId);
    });

    test("rejects a period when no capital system account is bound", async () => {
      await db
        .delete(systemAccounts)
        .where(
          and(
            eq(systemAccounts.organizationId, organizationId),
            eq(systemAccounts.purpose, SystemAccountPurpose.CAPITAL),
          ),
        );

      await book({
        organizationId,
        debitAccountId: privateId,
        creditAccountId: assetId,
        amount: 300n,
      });

      const result = await closeService(periodId).close({ mode: PeriodCloseMode.CLOSING_ENTRIES });

      expect(result.status).toBe("error");
      expect(result.status === "error" && String(result.err)).toContain(
        "No capital system account defined",
      );
    });
  });

  describe("close with the status only mode", () => {
    test("marks the period as closed", async () => {
      const result = await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("success");

      const [period] = await db.select().from(periods).where(eq(periods.id, periodId));

      expect(period?.status).toBe(PeriodStatus.CLOSED);
    });

    test("books no closing entries", async () => {
      await book({
        organizationId,
        debitAccountId: assetId,
        creditAccountId: incomeId,
        amount: 1000n,
      });

      await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(await listPostingsOn({ organizationId, validOn: PERIOD_END })).toHaveLength(0);
      expect(await listPostingsOn({ organizationId, validOn: NEXT_PERIOD_START })).toHaveLength(0);
      expect(await listPeriodLinks(organizationId)).toHaveLength(0);
    });

    test("closes a period whose VAT periods are closed", async () => {
      await db.insert(vatPeriods).values({
        organizationId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.CLOSED,
      });

      const result = await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("success");
    });

    test("rejects a period while one of its VAT periods is open", async () => {
      await db.insert(vatPeriods).values({
        organizationId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.OPEN,
      });

      const result = await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("error");
      expect(result.status === "error" && String(result.err)).toContain(
        "before its VAT periods are closed",
      );

      const [period] = await db.select().from(periods).where(eq(periods.id, periodId));

      expect(period?.status).toBe(PeriodStatus.OPEN);
    });

    test("rejects a period while a previous period is open", async () => {
      const result = await closeService(nextPeriodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("error");
      expect(result.status === "error" && String(result.err)).toContain(
        "before the previous periods are closed",
      );
    });

    test("closes a period once the previous periods are closed", async () => {
      await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      const result = await closeService(nextPeriodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("success");
    });

    test("closes a period that no period follows", async () => {
      const lonelyOrganizationId = await createOrganization(db, TEST_USER_ID);
      const lonelyPeriodId = await createPeriod({
        organizationId: lonelyOrganizationId,
        startOn: PERIOD_START,
        endOn: PERIOD_END,
      });

      const result = await closeService(lonelyPeriodId).close({
        mode: PeriodCloseMode.STATUS_ONLY,
      });

      expect(result.status).toBe("success");
    });

    test("rejects a period that is already closed", async () => {
      await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      const result = await closeService(periodId).close({ mode: PeriodCloseMode.STATUS_ONLY });

      expect(result.status).toBe("error");
      expect(result.status === "error" && String(result.err)).toContain("is closed and not open");
    });
  });
});
