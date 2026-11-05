import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import {
  getVatDeclarationExpenses,
  getVatDeclarationIncomes,
  getVatDeclarationManualIncomes,
  getVatDeclarationNonConsiderations,
} from "../../../src/core/_helpers/vat-declaration";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import { CreateJournalService } from "../../../src/ledger/services/journal/journal.create";
import { insertJournal } from "../../../src/ledger/_helpers/journal";
import type { DbCollectionStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  createVatSettings,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const ledgerPeriods = DbSchema.Ledger.Periods.PeriodsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

type PostingInput = { accountId: string; debit?: bigint; credit?: bigint; vatRateId?: string };

const debit = (accountId: string, amount: bigint, vatRateId?: string): PostingInput => ({
  accountId,
  debit: amount,
  vatRateId,
});

const credit = (accountId: string, amount: bigint, vatRateId?: string): PostingInput => ({
  accountId,
  credit: amount,
  vatRateId,
});

const toJournalValues = (validOn: string, postings: PostingInput[]) => ({
  entry: { validOn: new Date(validOn), reference: "TEST-ENTRY" },
  postings: postings.map((posting) => ({
    accountId: posting.accountId,
    description: "Posting",
    currency: "CHF",
    exchangeRate: EXCHANGE_RATE_ONE,
    vatRateId: posting.vatRateId ?? null,
    debit: posting.debit ?? 0n,
    credit: posting.credit ?? 0n,
  })),
});

const postEntry = async (
  organizationId: string,
  validOn: string,
  postings: PostingInput[],
): Promise<string> => {
  const result = await DbCollectionJournal.create({
    db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: TEST_USER_ID,
    foreignKeyId: organizationId,
  }).insert({ values: toJournalValues(validOn, postings) });

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.entry.id;
};

const postEntryWithVat = async (
  organizationId: string,
  validOn: string,
  postings: PostingInput[],
): Promise<string> => {
  const result = await CreateJournalService.create({
    db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: TEST_USER_ID,
    organizationId,
  }).create({ values: toJournalValues(validOn, postings) });

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.entry.id;
};

const seedInvoice = async (organizationId: string, vatRateId: string | null): Promise<string> => {
  const clientId = await createClient(db, organizationId);
  return await createDraftInvoice(db, { organizationId, clientId, vatRateId });
};

const postInvoiceEntry = async (
  invoiceId: string,
  type: InvoiceJournalEntryType,
  organizationId: string,
  validOn: string,
  postings: PostingInput[],
): Promise<void> => {
  const { entry, postings: journalPostings } = toJournalValues(validOn, postings);

  await db.transaction(async (tx) => {
    const journal = await insertJournal({
      tx,
      values: { entry: { ...entry, organizationId }, postings: journalPostings },
    });

    await tx
      .insert(invoiceJournalEntries)
      .values({ organizationId, invoiceId, journalEntryId: journal.entry.id, type });
  });
};

const seedRate = async (
  organizationId: string,
  type: VatType,
  rate: number,
  netRate?: number,
): Promise<string> => {
  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: type,
      type,
      rate,
      netRate,
      startOn: new Date("2024-01-01"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const totals = (rows: { type: VatType; totalDebit: bigint; totalCredit: bigint }[]) =>
  rows
    .map(({ type, totalDebit, totalCredit }) => ({ type, totalDebit, totalCredit }))
    .toSorted((a, b) => a.type.localeCompare(b.type));

describe("core/_helpers/vat-declaration", () => {
  let orgId: string;
  let otherOrgId: string;

  const incomes = (
    remunerationMethod: VatRemunerationMethod,
    startOn: string,
    endOn: string,
    organizationId: string = orgId,
  ) =>
    db.transaction((tx) =>
      getVatDeclarationIncomes({
        tx,
        organizationId,
        remunerationMethod,
        startOn: new Date(startOn),
        endOn: new Date(endOn),
      }),
    );

  const expenses = (startOn: string, endOn: string) =>
    db.transaction((tx) =>
      getVatDeclarationExpenses({
        tx,
        organizationId: orgId,
        startOn: new Date(startOn),
        endOn: new Date(endOn),
      }),
    );

  const manualIncomes = (startOn: string, endOn: string) =>
    db.transaction((tx) =>
      getVatDeclarationManualIncomes({
        tx,
        organizationId: orgId,
        startOn: new Date(startOn),
        endOn: new Date(endOn),
      }),
    );

  const nonConsiderations = (startOn: string, endOn: string) =>
    db.transaction((tx) =>
      getVatDeclarationNonConsiderations({
        tx,
        organizationId: orgId,
        startOn: new Date(startOn),
        endOn: new Date(endOn),
      }),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_USER_ID);

    await db.insert(ledgerPeriods).values([
      { organizationId: orgId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") },
      {
        organizationId: otherOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      },
    ]);

    const netRate = await seedRate(orgId, VatType.NET_RATE_TAX, 8.1, 6.2);
    const nonTaxable = await seedRate(orgId, VatType.NON_TAXABLE_TURNOVER, 0);
    const acquisition = await seedRate(orgId, VatType.ACQUISITION_TAX_MATERIALS, 8.1);
    const nonConsideration = await seedRate(orgId, VatType.NON_CONSIDERATION, 0);
    const otherNetRate = await seedRate(otherOrgId, VatType.NET_RATE_TAX, 8.1, 6.2);

    await createVatSettings(db, {
      organizationId: orgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    await createVatSettings(db, {
      organizationId: otherOrgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });

    const asset = await leafAccountId(db, orgId, AccountType.ASSET);
    const income = await leafAccountId(db, orgId, AccountType.INCOME);
    const expense = await leafAccountId(db, orgId, AccountType.EXPENSE);
    const liability = await leafAccountId(db, orgId, AccountType.LIABILITY);
    const otherAsset = await leafAccountId(db, otherOrgId, AccountType.ASSET);
    const otherIncome = await leafAccountId(db, otherOrgId, AccountType.INCOME);

    const postOpen = async (
      vatRateId: string | null,
      validOn: string,
      amount: bigint,
    ): Promise<string> => {
      const invoiceId = await seedInvoice(orgId, vatRateId);
      await postInvoiceEntry(invoiceId, InvoiceJournalEntryType.OPEN, orgId, validOn, [
        debit(asset, amount),
        credit(income, amount, vatRateId ?? undefined),
      ]);
      return invoiceId;
    };

    const grossInvoiceId = await seedInvoice(orgId, netRate);
    await postInvoiceEntry(grossInvoiceId, InvoiceJournalEntryType.OPEN, orgId, "2026-01-10", [
      debit(asset, 108_100n),
      credit(income, 101_400n, netRate),
      credit(liability, 6_700n),
    ]);
    await postOpen(null, "2026-01-20", 70_000n);

    const otherInvoiceId = await seedInvoice(otherOrgId, otherNetRate);
    await postInvoiceEntry(otherInvoiceId, InvoiceJournalEntryType.OPEN, otherOrgId, "2026-01-10", [
      debit(otherAsset, 90_000n),
      credit(otherIncome, 90_000n, otherNetRate),
    ]);

    const voidedInvoiceId = await postOpen(netRate, "2026-02-05", 50_000n);
    await postInvoiceEntry(voidedInvoiceId, InvoiceJournalEntryType.VOID, orgId, "2026-02-15", [
      debit(income, 50_000n, netRate),
      credit(asset, 50_000n),
    ]);
    await postOpen(netRate, "2026-02-10", 30_000n);

    await postOpen(netRate, "2026-03-10", 40_000n);
    await postOpen(nonTaxable, "2026-03-10", 20_000n);
    await postEntryWithVat(orgId, "2026-03-15", [
      debit(asset, 99_000n),
      credit(income, 99_000n, netRate),
    ]);

    const paidInvoiceId = await postOpen(netRate, "2026-04-01", 100_000n);
    await postInvoiceEntry(paidInvoiceId, InvoiceJournalEntryType.PAYMENT, orgId, "2026-04-20", [
      debit(asset, 60_000n),
      credit(asset, 60_000n),
      debit(liability, 3_000n, netRate),
      credit(liability, 3_000n, netRate),
    ]);

    await postEntryWithVat(orgId, "2026-05-10", [
      debit(expense, 50_000n, acquisition),
      credit(asset, 50_000n),
    ]);
    await postEntryWithVat(orgId, "2026-06-01", [
      debit(expense, 20_000n, acquisition),
      credit(asset, 20_000n),
    ]);

    await postEntry(orgId, "2026-07-10", [
      debit(asset, 30_000n, nonConsideration),
      credit(income, 30_000n, nonConsideration),
    ]);
    await postEntryWithVat(orgId, "2026-07-20", [
      debit(asset, 5_000n, netRate),
      credit(income, 5_000n, netRate),
    ]);
  }, 120_000);

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("getVatDeclarationIncomes", () => {
    describe("agreed method", () => {
      test("counts the receivable of the open entries with the rate of their invoice", async () => {
        const rows = await incomes(VatRemunerationMethod.AGREED, "2026-01-01", "2026-01-31");

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 108_100n, totalCredit: 0n },
        ]);
      });

      test("returns the rate details of the invoice", async () => {
        const rows = await incomes(VatRemunerationMethod.AGREED, "2026-01-01", "2026-01-31");

        expect(rows).toHaveLength(1);
        expect(rows[0]?.rate).toBe(8.1);
        expect(rows[0]?.netRate).toBe(6.2);
        expect(rows[0]?.startOn).toEqual(new Date("2024-01-01"));
        expect(rows[0]?.endOn).toBeNull();
      });

      test("credits back the receivable of the void entries of the period", async () => {
        const rows = await incomes(VatRemunerationMethod.AGREED, "2026-02-01", "2026-02-28");

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 80_000n, totalCredit: 50_000n },
        ]);
      });

      test("groups the totals by VAT rate and ignores entries not linked to an invoice", async () => {
        const rows = await incomes(VatRemunerationMethod.AGREED, "2026-03-01", "2026-03-31");

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 40_000n, totalCredit: 0n },
          { type: VatType.NON_TAXABLE_TURNOVER, totalDebit: 20_000n, totalCredit: 0n },
        ]);
      });

      test("ignores the payment entries", async () => {
        const rows = await incomes(VatRemunerationMethod.AGREED, "2026-04-01", "2026-04-30");

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 100_000n, totalCredit: 0n },
        ]);
      });

      test("ignores the entries of other organizations", async () => {
        const rows = await incomes(
          VatRemunerationMethod.AGREED,
          "2026-01-01",
          "2026-01-31",
          otherOrgId,
        );

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 90_000n, totalCredit: 0n },
        ]);
      });

      test("returns an empty list for a period without entries", async () => {
        expect(await incomes(VatRemunerationMethod.AGREED, "2026-09-01", "2026-09-30")).toEqual([]);
      });
    });

    describe("received method", () => {
      test("counts the asset postings of the payment entries with the rate of their invoice", async () => {
        const rows = await incomes(VatRemunerationMethod.RECEIVED, "2026-04-01", "2026-04-30");

        expect(totals(rows)).toEqual([
          { type: VatType.NET_RATE_TAX, totalDebit: 60_000n, totalCredit: 60_000n },
        ]);
      });

      test("ignores the open entries", async () => {
        expect(await incomes(VatRemunerationMethod.RECEIVED, "2026-01-01", "2026-03-31")).toEqual(
          [],
        );
      });
    });
  });

  describe("getVatDeclarationManualIncomes", () => {
    test("counts the gross amount booked on income accounts with a net rate, the entries of invoices aside", async () => {
      const rows = await manualIncomes("2026-03-01", "2026-03-31");

      expect(totals(rows)).toEqual([
        { type: VatType.NET_RATE_TAX, totalDebit: 0n, totalCredit: 99_000n },
      ]);
    });

    test("ignores the non-consideration postings", async () => {
      const rows = await manualIncomes("2026-07-01", "2026-07-31");

      expect(totals(rows)).toEqual([
        { type: VatType.NET_RATE_TAX, totalDebit: 0n, totalCredit: 5_000n },
      ]);
    });

    test("counts the non-taxable turnover and its refunds", async () => {
      const asset = await leafAccountId(db, orgId, AccountType.ASSET);
      const income = await leafAccountId(db, orgId, AccountType.INCOME);
      const [rate] = await db
        .select({ id: vatRates.id })
        .from(vatRates)
        .where(
          and(eq(vatRates.organizationId, orgId), eq(vatRates.code, VatType.NON_TAXABLE_TURNOVER)),
        );
      assertNonNullish(rate);

      await postEntryWithVat(orgId, "2026-10-05", [
        debit(asset, 12_000n),
        credit(income, 12_000n, rate.id),
      ]);
      await postEntryWithVat(orgId, "2026-10-20", [
        debit(income, 2_000n, rate.id),
        credit(asset, 2_000n),
      ]);

      const rows = await manualIncomes("2026-10-01", "2026-10-31");

      expect(totals(rows)).toEqual([
        { type: VatType.NON_TAXABLE_TURNOVER, totalDebit: 2_000n, totalCredit: 12_000n },
      ]);
    });

    test("returns an empty list for a period without manual turnover", async () => {
      expect(await manualIncomes("2026-09-01", "2026-09-30")).toEqual([]);
    });
  });

  describe("getVatDeclarationExpenses", () => {
    test("counts the expense postings of the period by VAT rate", async () => {
      const rows = await expenses("2026-05-01", "2026-05-31");

      expect(totals(rows)).toEqual([
        { type: VatType.ACQUISITION_TAX_MATERIALS, totalDebit: 54_050n, totalCredit: 0n },
      ]);
    });

    test("returns an empty list for a period without expense postings", async () => {
      expect(await expenses("2026-09-01", "2026-09-30")).toEqual([]);
    });
  });

  describe("getVatDeclarationNonConsiderations", () => {
    test("counts the income postings of the period not linked to an invoice, other VAT types aside", async () => {
      const rows = await nonConsiderations("2026-07-01", "2026-07-31");

      expect(totals(rows)).toEqual([
        { type: VatType.NON_CONSIDERATION, totalDebit: 0n, totalCredit: 30_000n },
      ]);
    });

    test("returns an empty list for a period without non-consideration postings", async () => {
      expect(await nonConsiderations("2026-09-01", "2026-09-30")).toEqual([]);
    });
  });
});
