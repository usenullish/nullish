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
  SystemAccountPurpose,
  VatPaymentMethod,
  VatPeriodStatus,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import type { Reports } from "@usenullish/nullish-schema/reports";
import { GetVatRateError } from "../../../src/core/_helpers/vat";
import {
  VatDeclarationReport,
  type VatReportArgs,
} from "../../../src/core/reports/vat-declaration";
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
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const ledgerPeriods = DbSchema.Ledger.Periods.PeriodsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const vatPeriods = DbSchema.Core.Vat.VatPeriodsSchema;
const accountingSettings = DbSchema.Core.Accounting.AccountingSettingsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

type Declaration = Reports["Vat"]["Declaration"]["Result"];

const ZERO: Declaration = {
  box200: 0n,
  box220: 0n,
  box225: 0n,
  box235: 0n,
  box289: 0n,
  box299: 0n,
  box302: [],
  box303: [],
  box322: [],
  box323: [],
  box382: { taxableBase: 0n, taxAmount: 0n },
  box383: { taxableBase: 0n, taxAmount: 0n },
  box399: 0n,
  box400: 0n,
  box405: 0n,
  box415: 0n,
  box470: 0n,
  box471: 0n,
  box479: 0n,
  box500: 0n,
  box510: 0n,
  box910: 0n,
};

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

const seedInvoice = async (organizationId: string, vatRateId: string): Promise<string> => {
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
  values: {
    code: string;
    type: VatType;
    rate: number;
    netRate?: number;
    startOn: string;
    endOn?: string;
  },
): Promise<string> => {
  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: values.code,
      type: values.type,
      rate: values.rate,
      netRate: values.netRate,
      startOn: new Date(values.startOn),
      endOn: values.endOn === undefined ? undefined : new Date(values.endOn),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const seedVatPeriod = async (
  organizationId: string,
  startOn: string,
  endOn: string,
): Promise<string> => {
  const [row] = await db
    .insert(vatPeriods)
    .values({
      organizationId,
      startOn: new Date(startOn),
      endOn: new Date(endOn),
      status: VatPeriodStatus.OPEN,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const generate = (organizationId: string, vatPeriodId: string) =>
  VatDeclarationReport.create({
    db: db as unknown as VatReportArgs["db"],
    userId: TEST_USER_ID,
    organizationId,
  }).generate({ vatPeriodId });

const declaration = async (organizationId: string, vatPeriodId: string): Promise<Declaration> => {
  const result = await generate(organizationId, vatPeriodId);

  if (result.status === "error") {
    throw result.err;
  }

  return result.result;
};

const failure = async (organizationId: string, vatPeriodId: string): Promise<unknown> => {
  const result = await generate(organizationId, vatPeriodId);

  if (result.status === "success") {
    throw new Error("expected an error Result");
  }

  return result.err;
};

describe("vat-declaration", () => {
  let orgId: string;
  let siblingOrgId: string;
  let receivedOrgId: string;
  let foreignCurrencyOrgId: string;

  const periodIds = {} as Record<
    | "pre2024"
    | "netRate"
    | "creditNote"
    | "exempt"
    | "subsidy"
    | "acquisition"
    | "boundaries"
    | "empty"
    | "unlinked"
    | "badDebt"
    | "received"
    | "sibling"
    | "foreignCurrency",
    string
  >;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    receivedOrgId = await createOrganization(db, TEST_USER_ID);
    foreignCurrencyOrgId = await createOrganization(db, TEST_USER_ID);

    await db
      .update(accountingSettings)
      .set({ baseCurrency: "EUR" })
      .where(eq(accountingSettings.organizationId, foreignCurrencyOrgId));

    await db.insert(ledgerPeriods).values([
      { organizationId: orgId, startOn: new Date("2023-01-01"), endOn: new Date("2026-12-31") },
      {
        organizationId: siblingOrgId,
        startOn: new Date("2023-01-01"),
        endOn: new Date("2026-12-31"),
      },
      {
        organizationId: receivedOrgId,
        startOn: new Date("2023-01-01"),
        endOn: new Date("2026-12-31"),
      },
      {
        organizationId: foreignCurrencyOrgId,
        startOn: new Date("2023-01-01"),
        endOn: new Date("2026-12-31"),
      },
    ]);

    await createVatSettings(db, {
      organizationId: orgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    await createVatSettings(db, {
      organizationId: siblingOrgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    await createVatSettings(db, {
      organizationId: receivedOrgId,
      remunerationMethod: VatRemunerationMethod.RECEIVED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    await createVatSettings(db, {
      organizationId: foreignCurrencyOrgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });

    const generated = await db
      .select({ id: vatPeriods.id, startOn: vatPeriods.startOn })
      .from(vatPeriods)
      .where(eq(vatPeriods.organizationId, orgId));
    const firstSemester2023 = generated.find(
      (period) => period.startOn.getTime() === new Date("2023-01-01").getTime(),
    );
    assertNonNullish(firstSemester2023);
    periodIds.pre2024 = firstSemester2023.id;

    periodIds.netRate = await seedVatPeriod(orgId, "2026-01-01", "2026-01-31");
    periodIds.creditNote = await seedVatPeriod(orgId, "2026-02-01", "2026-02-28");
    periodIds.exempt = await seedVatPeriod(orgId, "2026-03-01", "2026-03-31");
    periodIds.subsidy = await seedVatPeriod(orgId, "2026-04-01", "2026-04-30");
    periodIds.acquisition = await seedVatPeriod(orgId, "2026-05-01", "2026-05-31");
    periodIds.boundaries = await seedVatPeriod(orgId, "2026-07-01", "2026-07-31");
    periodIds.empty = await seedVatPeriod(orgId, "2026-09-01", "2026-09-30");
    periodIds.unlinked = await seedVatPeriod(orgId, "2026-10-01", "2026-10-31");
    periodIds.badDebt = await seedVatPeriod(orgId, "2026-11-01", "2026-11-30");
    periodIds.sibling = await seedVatPeriod(siblingOrgId, "2026-01-01", "2026-06-30");
    periodIds.received = await seedVatPeriod(receivedOrgId, "2026-01-01", "2026-01-31");
    periodIds.foreignCurrency = await seedVatPeriod(
      foreignCurrencyOrgId,
      "2026-01-01",
      "2026-01-31",
    );

    const netRatePre = await seedRate(orgId, {
      code: "NET-PRE",
      type: VatType.NET_RATE_TAX,
      rate: 7.7,
      netRate: 6.1,
      startOn: "2023-01-01",
      endOn: "2023-12-31",
    });
    const netRatePost = await seedRate(orgId, {
      code: "NET-POST",
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: "2024-01-01",
    });
    const nonTaxable = await seedRate(orgId, {
      code: "NON-TAXABLE",
      type: VatType.NON_TAXABLE_TURNOVER,
      rate: 0,
      startOn: "2023-01-01",
    });
    const nonConsideration = await seedRate(orgId, {
      code: "NON-CONSIDERATION",
      type: VatType.NON_CONSIDERATION,
      rate: 0,
      startOn: "2023-01-01",
    });
    const acquisitionPre = await seedRate(orgId, {
      code: "ACQ-PRE",
      type: VatType.ACQUISITION_TAX_MATERIALS,
      rate: 7.7,
      startOn: "2023-01-01",
      endOn: "2023-12-31",
    });
    const acquisitionPost = await seedRate(orgId, {
      code: "ACQ-POST",
      type: VatType.ACQUISITION_TAX_MATERIALS,
      rate: 8.1,
      startOn: "2024-01-01",
    });
    const siblingNetRate = await seedRate(siblingOrgId, {
      code: "NET-POST",
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: "2024-01-01",
    });

    const asset = await leafAccountId(db, orgId, AccountType.ASSET);
    const income = await leafAccountId(db, orgId, AccountType.INCOME);
    const expense = await leafAccountId(db, orgId, AccountType.EXPENSE);
    const siblingAsset = await leafAccountId(db, siblingOrgId, AccountType.ASSET);
    const siblingIncome = await leafAccountId(db, siblingOrgId, AccountType.INCOME);

    const postOpen = async (
      vatRateId: string,
      validOn: string,
      amount: bigint,
    ): Promise<string> => {
      const invoiceId = await seedInvoice(orgId, vatRateId);
      await postInvoiceEntry(invoiceId, InvoiceJournalEntryType.OPEN, orgId, validOn, [
        debit(asset, amount),
        credit(income, amount, vatRateId),
      ]);
      return invoiceId;
    };

    await postOpen(netRatePre, "2023-03-15", 1_000_000n);
    await postEntryWithVat(orgId, "2023-03-20", [
      debit(expense, 200_000n, acquisitionPre),
      credit(asset, 200_000n),
    ]);

    await postOpen(netRatePost, "2026-01-15", 1_000_000n);

    const siblingInvoiceId = await seedInvoice(siblingOrgId, siblingNetRate);
    await postInvoiceEntry(
      siblingInvoiceId,
      InvoiceJournalEntryType.OPEN,
      siblingOrgId,
      "2026-01-15",
      [debit(siblingAsset, 500_000n), credit(siblingIncome, 500_000n, siblingNetRate)],
    );

    await postOpen(netRatePost, "2026-02-10", 1_000_000n);
    const voidedInvoiceId = await postOpen(netRatePost, "2026-02-12", 200_000n);
    await postInvoiceEntry(voidedInvoiceId, InvoiceJournalEntryType.VOID, orgId, "2026-02-20", [
      debit(income, 200_000n, netRatePost),
      credit(asset, 200_000n),
    ]);

    await postOpen(netRatePost, "2026-03-10", 1_000_000n);
    await postOpen(nonTaxable, "2026-03-10", 300_000n);

    await postOpen(nonConsideration, "2026-04-10", 100_000n);
    await postEntry(orgId, "2026-04-15", [
      debit(asset, 50_000n, nonConsideration),
      credit(income, 50_000n, nonConsideration),
    ]);

    await postEntryWithVat(orgId, "2026-05-10", [
      debit(expense, 500_000n, acquisitionPost),
      credit(asset, 500_000n),
    ]);

    for (const validOn of ["2026-06-30", "2026-07-01", "2026-07-31", "2026-08-01"]) {
      await postOpen(netRatePost, validOn, 100_000n);
    }

    await postEntryWithVat(orgId, "2026-10-10", [
      debit(asset, 1_000_000n),
      credit(income, 1_000_000n, netRatePost),
    ]);

    const writtenOffInvoiceId = await postOpen(netRatePost, "2026-11-05", 1_000_000n);
    await postInvoiceEntry(
      writtenOffInvoiceId,
      InvoiceJournalEntryType.UNCOLLECTIBLE,
      orgId,
      "2026-11-20",
      [debit(expense, 400_000n), credit(asset, 400_000n)],
    );

    const receivedNetRate = await seedRate(receivedOrgId, {
      code: "NET-POST",
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: "2024-01-01",
    });
    const receivedAsset = await leafAccountId(db, receivedOrgId, AccountType.ASSET);
    const receivedIncome = await leafAccountId(db, receivedOrgId, AccountType.INCOME);
    const receivedInvoiceId = await seedInvoice(receivedOrgId, receivedNetRate);

    await postInvoiceEntry(
      receivedInvoiceId,
      InvoiceJournalEntryType.OPEN,
      receivedOrgId,
      "2026-01-05",
      [debit(receivedAsset, 1_000_000n), credit(receivedIncome, 1_000_000n, receivedNetRate)],
    );
    await postInvoiceEntry(
      receivedInvoiceId,
      InvoiceJournalEntryType.PAYMENT,
      receivedOrgId,
      "2026-01-20",
      [debit(receivedAsset, 600_000n), credit(receivedAsset, 600_000n)],
    );
  }, 120_000);

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("generate", () => {
    test("computes the turnover and the net rate tax of the period", async () => {
      expect(await declaration(orgId, periodIds.netRate)).toEqual({
        ...ZERO,
        box200: 1_000_000n,
        box299: 1_000_000n,
        box323: [{ rate: 6200n, taxableBase: 1_000_000n, taxAmount: 62_000n }],
        box399: 62_000n,
        box500: 62_000n,
      });
    });

    test("subtracts the invoices voided in the period", async () => {
      expect(await declaration(orgId, periodIds.creditNote)).toEqual({
        ...ZERO,
        box200: 1_000_000n,
        box299: 1_000_000n,
        box323: [{ rate: 6200n, taxableBase: 1_000_000n, taxAmount: 62_000n }],
        box399: 62_000n,
        box500: 62_000n,
      });
    });

    test("deducts non-taxable turnover from the taxable turnover", async () => {
      expect(await declaration(orgId, periodIds.exempt)).toEqual({
        ...ZERO,
        box200: 1_300_000n,
        box220: 300_000n,
        box289: 300_000n,
        box299: 1_000_000n,
        box323: [{ rate: 6200n, taxableBase: 1_000_000n, taxAmount: 62_000n }],
        box399: 62_000n,
        box500: 62_000n,
      });
    });

    test("reports non-consideration receipts in box 910 only, invoiced or not", async () => {
      expect(await declaration(orgId, periodIds.subsidy)).toEqual({
        ...ZERO,
        box910: 150_000n,
      });
    });

    test("derives the acquisition tax from the purchases and their generated tax line", async () => {
      expect(await declaration(orgId, periodIds.acquisition)).toEqual({
        ...ZERO,
        box383: { taxableBase: 500_000n, taxAmount: 40_500n },
        box399: 40_500n,
        box500: 40_500n,
      });
    });

    test("buckets rates starting before 2024 apart from the later ones", async () => {
      expect(await declaration(orgId, periodIds.pre2024)).toEqual({
        ...ZERO,
        box200: 1_000_000n,
        box299: 1_000_000n,
        box322: [{ rate: 6100n, taxableBase: 1_000_000n, taxAmount: 61_000n }],
        box382: { taxableBase: 200_000n, taxAmount: 15_400n },
        box399: 76_400n,
        box500: 76_400n,
      });
    });

    test("includes postings on the first and last day of the period only", async () => {
      expect(await declaration(orgId, periodIds.boundaries)).toEqual({
        ...ZERO,
        box200: 200_000n,
        box299: 200_000n,
        box323: [{ rate: 6200n, taxableBase: 200_000n, taxAmount: 12_400n }],
        box399: 12_400n,
        box500: 12_400n,
      });
    });

    test("returns zeros and empty rate lists for a period without postings", async () => {
      expect(await declaration(orgId, periodIds.empty)).toEqual(ZERO);
    });

    test("counts the turnover of journal entries not linked to an invoice", async () => {
      expect(await declaration(orgId, periodIds.unlinked)).toEqual({
        ...ZERO,
        box200: 1_000_000n,
        box299: 1_000_000n,
        box323: [{ rate: 6200n, taxableBase: 1_000_000n, taxAmount: 62_000n }],
        box399: 62_000n,
        box500: 62_000n,
      });
    });

    test("deducts the invoices written off with the agreed method from the turnover and the tax", async () => {
      expect(await declaration(orgId, periodIds.badDebt)).toEqual({
        ...ZERO,
        box200: 1_000_000n,
        box235: 400_000n,
        box289: 400_000n,
        box299: 600_000n,
        box323: [{ rate: 6200n, taxableBase: 600_000n, taxAmount: 37_200n }],
        box399: 37_200n,
        box500: 37_200n,
      });
    });

    test("counts the payments of the period on the received method", async () => {
      expect(await declaration(receivedOrgId, periodIds.received)).toEqual({
        ...ZERO,
        box200: 600_000n,
        box299: 600_000n,
        box323: [{ rate: 6200n, taxableBase: 600_000n, taxAmount: 37_200n }],
        box399: 37_200n,
        box500: 37_200n,
      });
    });

    test("ignores the postings of other organizations", async () => {
      const own = await declaration(orgId, periodIds.netRate);

      expect(own.box200).toBe(1_000_000n);
    });

    test("errors when the organization has no VAT methods", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await db.insert(ledgerPeriods).values({
        organizationId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });
      const vatPeriodId = await seedVatPeriod(organizationId, "2026-01-01", "2026-06-30");

      const err = await failure(organizationId, vatPeriodId);

      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain("No VAT methods configured");
    });

    test("errors when the base currency of the organization is not CHF", async () => {
      const err = await failure(foreignCurrencyOrgId, periodIds.foreignCurrency);

      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain("CHF as base currency");
    });

    test("errors with GetVatRateError when the VAT period does not exist", async () => {
      expect(await failure(orgId, TEST_MISSING_ID)).toBeInstanceOf(GetVatRateError);
    });

    test("errors with GetVatRateError for a VAT period of another organization", async () => {
      expect(await failure(orgId, periodIds.sibling)).toBeInstanceOf(GetVatRateError);
    });

    test("returns an error Result for an invalid VAT period id", async () => {
      const result = await generate(orgId, "not-a-uuid");

      expect(result.status).toBe("error");
    });
  });

  describe("effective method", () => {
    let effectiveOrgId: string;
    let vatPeriodId: string;

    beforeAll(async () => {
      effectiveOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(ledgerPeriods).values({
        organizationId: effectiveOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      const salesTax = await seedRate(effectiveOrgId, {
        code: "SALES-POST",
        type: VatType.SALES_TAX_DUE,
        rate: 8.1,
        startOn: "2024-01-01",
      });
      const reducedSalesTax = await seedRate(effectiveOrgId, {
        code: "SALES-REDUCED",
        type: VatType.SALES_TAX_DUE,
        rate: 2.6,
        startOn: "2024-01-01",
      });
      const inputTax = await seedRate(effectiveOrgId, {
        code: "INPUT-MATERIALS",
        type: VatType.INPUT_TAX_MATERIALS,
        rate: 8.1,
        startOn: "2024-01-01",
      });
      const inputTaxInvestments = await seedRate(effectiveOrgId, {
        code: "INPUT-INVESTMENTS",
        type: VatType.INPUT_TAX_INVESTMENTS,
        rate: 8.1,
        startOn: "2024-01-01",
      });
      const acquisitionTax = await seedRate(effectiveOrgId, {
        code: "ACQ-EFFECTIVE",
        type: VatType.ACQUISITION_TAX_MATERIALS,
        rate: 8.1,
        startOn: "2024-01-01",
      });
      const importTax = await seedRate(effectiveOrgId, {
        code: "IMPORT-MATERIALS",
        type: VatType.IMPORT_TAX_MATERIALS,
        rate: 100,
        startOn: "2024-01-01",
      });

      await createVatSettings(db, {
        organizationId: effectiveOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      const generated = await db
        .select({ id: vatPeriods.id, startOn: vatPeriods.startOn, endOn: vatPeriods.endOn })
        .from(vatPeriods)
        .where(eq(vatPeriods.organizationId, effectiveOrgId));
      const period = generated.find(
        ({ startOn, endOn }) =>
          startOn.getTime() <= new Date("2026-02-10").getTime() &&
          new Date("2026-02-10").getTime() <= endOn.getTime() &&
          startOn.getTime() <= new Date("2026-01-15").getTime(),
      );
      assertNonNullish(period);
      vatPeriodId = period.id;

      const asset = await leafAccountId(db, effectiveOrgId, AccountType.ASSET);
      const income = await leafAccountId(db, effectiveOrgId, AccountType.INCOME);
      const liability = await leafAccountId(db, effectiveOrgId, AccountType.LIABILITY);

      const invoiceId = await seedInvoice(effectiveOrgId, salesTax);
      await postInvoiceEntry(
        invoiceId,
        InvoiceJournalEntryType.OPEN,
        effectiveOrgId,
        "2026-01-15",
        [debit(asset, 108_100n), credit(income, 100_000n, salesTax), credit(liability, 8_100n)],
      );

      await postEntryWithVat(effectiveOrgId, "2026-02-10", [
        debit(asset, 10_260n),
        credit(income, 10_260n, reducedSalesTax),
      ]);

      const writtenOffInvoiceId = await seedInvoice(effectiveOrgId, salesTax);
      await postInvoiceEntry(
        writtenOffInvoiceId,
        InvoiceJournalEntryType.OPEN,
        effectiveOrgId,
        "2026-02-20",
        [debit(asset, 54_050n), credit(income, 50_000n, salesTax), credit(liability, 4_050n)],
      );
      await postInvoiceEntry(
        writtenOffInvoiceId,
        InvoiceJournalEntryType.UNCOLLECTIBLE,
        effectiveOrgId,
        "2026-02-25",
        [debit(liability, 54_050n), credit(asset, 54_050n)],
      );

      const expense = await leafAccountId(db, effectiveOrgId, AccountType.EXPENSE);
      const [inputTaxAccount] = await db
        .select({ accountId: systemAccounts.accountId })
        .from(systemAccounts)
        .where(
          and(
            eq(systemAccounts.organizationId, effectiveOrgId),
            eq(systemAccounts.purpose, SystemAccountPurpose.TAX_PRE_MATERIAL),
          ),
        );
      assertNonNullish(inputTaxAccount);

      await postEntryWithVat(effectiveOrgId, "2026-02-12", [
        debit(expense, 10_810n, inputTax),
        credit(asset, 10_810n),
      ]);
      await postEntryWithVat(effectiveOrgId, "2026-02-13", [
        debit(asset, 21_620n, inputTaxInvestments),
        credit(liability, 21_620n),
      ]);
      await postEntryWithVat(effectiveOrgId, "2026-02-14", [
        debit(expense, 50_000n, acquisitionTax),
        credit(asset, 50_000n),
      ]);
      await postEntryWithVat(effectiveOrgId, "2026-02-15", [
        debit(inputTaxAccount.accountId, 1_500n, importTax),
        credit(asset, 1_500n),
      ]);
    }, 120_000);

    test("declares the turnover without VAT, the bad debts, the taxes owed and the input tax deductions", async () => {
      expect(await declaration(effectiveOrgId, vatPeriodId)).toEqual({
        ...ZERO,
        box200: 160_000n,
        box235: 50_000n,
        box289: 50_000n,
        box299: 110_000n,
        box303: [
          { rate: 8100n, taxableBase: 100_000n, taxAmount: 8_100n },
          { rate: 2600n, taxableBase: 10_000n, taxAmount: 260n },
        ],
        box383: { taxableBase: 50_000n, taxAmount: 4_050n },
        box399: 12_410n,
        box400: 6_360n,
        box405: 1_620n,
        box479: 7_980n,
        box500: 4_430n,
      });
    });
  });
});
