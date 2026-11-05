import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  InvoiceLineType,
  InvoiceStatus,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import { OpenInvoiceService } from "../../../../src/billing/services/invoices/invoice.open";
import type { InvoiceServiceArgs } from "../../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  createVatSettings,
  readAccountBalance,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  waitFor,
} from "../../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const lines = DbSchema.Billing.Invoices.LinesSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const journalPostings = DbSchema.Ledger.Journal.PostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const openService = (invoiceId: string): OpenInvoiceService =>
  OpenInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const loadOpenPostings = async (invId: string) => {
  const [link] = await db
    .select()
    .from(invoiceJournalEntries)
    .where(
      and(
        eq(invoiceJournalEntries.invoiceId, invId),
        eq(invoiceJournalEntries.type, InvoiceJournalEntryType.OPEN),
      ),
    );
  assertNonNullish(link);

  return db
    .select()
    .from(journalPostings)
    .where(eq(journalPostings.journalEntryId, link.journalEntryId));
};

const getSystemAccountId = async (
  organizationId: string,
  purpose: SystemAccountPurpose,
): Promise<string> => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    );
  assertNonNullish(row);

  return row.accountId;
};

const removeSystemAccount = (organizationId: string, purpose: SystemAccountPurpose) =>
  db
    .delete(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    );

const setUpOrgWithPeriod = async (): Promise<{ orgId: string; clientId: string }> => {
  const newOrgId = await createOrganization(db, TEST_USER_ID);
  await db.insert(periods).values({
    organizationId: newOrgId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });
  const newClientId = await createClient(db, newOrgId);

  return { orgId: newOrgId, clientId: newClientId };
};

describe("OpenInvoiceService", () => {
  let orgId: string;
  let clientId: string;
  let invoiceId: string;
  let negativeInvoiceId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    clientId = await createClient(db, orgId);

    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, invoiceId, "Item line");

    negativeInvoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, negativeInvoiceId, "Item line");
    await db.insert(lines).values({
      organizationId: orgId,
      invoiceId: negativeInvoiceId,
      type: InvoiceLineType.DISCOUNT,
      description: "Oversized discount",
      quantity: 1,
      unitPrice: 5000n,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("opens a draft invoice and records the opening journal entry", async () => {
    const result = await openService(invoiceId).open();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.id).toBe(invoiceId);
    expect(result.result.status).toBe(InvoiceStatus.OPEN);

    const links = await db
      .select()
      .from(invoiceJournalEntries)
      .where(eq(invoiceJournalEntries.invoiceId, invoiceId));

    expect(links).toHaveLength(1);
    expect(links[0]?.type).toBe(InvoiceJournalEntryType.OPEN);
  });

  test("numbers the invoices of a client in the order they are opened", async () => {
    const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();

    const firstCreatedId = await createDraftInvoice(db, {
      organizationId: caseOrgId,
      clientId: caseClientId,
    });
    await createLine(db, firstCreatedId, "Item line");

    const secondCreatedId = await createDraftInvoice(db, {
      organizationId: caseOrgId,
      clientId: caseClientId,
    });
    await createLine(db, secondCreatedId, "Item line");

    const openedFirst = await openService(secondCreatedId).open();
    const openedSecond = await openService(firstCreatedId).open();

    if (openedFirst.status === "error" || openedSecond.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(openedFirst.result.number).toBe(1);
    expect(openedSecond.result.number).toBe(2);
  });

  test("returns an error Result when discounts exceed items", async () => {
    const result = await openService(negativeInvoiceId).open();

    expect(result.status).toBe("error");
  });

  test("returns an error Result when the invoice is not a draft", async () => {
    const freshId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, freshId, "Item line");

    const service = openService(freshId);

    const first = await service.open();
    expect(first.status).toBe("success");

    const second = await service.open();
    expect(second.status).toBe("error");
  });

  describe("postings", () => {
    test("creates balanced debit and credit postings matching the invoice total", async () => {
      const invId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const totalDebit = postings.reduce((sum, posting) => sum + posting.debit, 0n);
      const totalCredit = postings.reduce((sum, posting) => sum + posting.credit, 0n);
      expect(totalDebit).toBe(totalCredit);

      const incomeAccountId = await getSystemAccountId(orgId, SystemAccountPurpose.DEFAULT_INCOME);
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(2);
      expect(revenuePosting.credit).toBe(1000n);
      expect(receivablePosting.debit).toBe(1000n);
    });

    test("adds a rounding difference posting when per-line truncation leaves a remainder", async () => {
      const invId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invId, "Fractional item", { quantity: 1.5, unitPrice: 333n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const incomeAccountId = await getSystemAccountId(orgId, SystemAccountPurpose.DEFAULT_INCOME);
      const roundingAccountId = await getSystemAccountId(
        orgId,
        SystemAccountPurpose.ROUNDING_DIFFERENCES,
      );
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const roundingPosting = postings.find((posting) => posting.accountId === roundingAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(roundingPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(3);
      expect(revenuePosting.credit).toBe(499n);
      expect(roundingPosting.credit).toBe(1n);
      expect(receivablePosting.debit).toBe(500n);
      expect(revenuePosting.credit + roundingPosting.credit).toBe(receivablePosting.debit);
    });
  });

  describe("VAT", () => {
    const seedVatSettings = (organizationId: string, remunerationMethod: VatRemunerationMethod) =>
      createVatSettings(db, {
        organizationId,
        remunerationMethod,
        paymentMethod: VatPaymentMethod.NET_RATE,
      });

    const seedVatRate = async (
      organizationId: string,
      type: VatType = VatType.NET_RATE_TAX,
      startOn: Date = new Date("2026-01-01"),
    ): Promise<string> => {
      const [row] = await db
        .insert(vatRates)
        .values({
          organizationId,
          code: type,
          type,
          rate: type === VatType.NET_RATE_TAX ? 8.1 : 0,
          netRate: type === VatType.NET_RATE_TAX ? 6.2 : null,
          startOn,
        })
        .returning();
      assertNonNullish(row);
      return row.id;
    };

    const seedVat = async (
      organizationId: string,
      remunerationMethod: VatRemunerationMethod,
    ): Promise<string> => {
      await seedVatSettings(organizationId, remunerationMethod);
      return await seedVatRate(organizationId);
    };

    test("splits revenue and VAT postings using the tax-due account on the agreed method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const incomeAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.DEFAULT_INCOME,
      );
      const vatAccountId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(vatPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(3);
      expect(revenuePosting.credit).toBe(10140n);
      expect(vatPosting.credit).toBe(670n);
      expect(receivablePosting.debit).toBe(10810n);
      expect(revenuePosting.credit + vatPosting.credit).toBe(receivablePosting.debit);
      expect(revenuePosting.vatRateId).toBe(vatRateId);
      expect(vatPosting.vatRateId).toBeNull();
      expect(receivablePosting.vatRateId).toBeNull();
    });

    test("uses the vat-remuneration-received account on the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const vatAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      assertNonNullish(vatPosting);

      expect(vatPosting.credit).toBe(670n);
    });

    test("keeps the ledger balanced when VAT and a rounding difference posting both apply", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Fractional taxable item", {
        quantity: 1.5,
        unitPrice: 333n,
      });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const incomeAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.DEFAULT_INCOME,
      );
      const vatAccountId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const roundingAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.ROUNDING_DIFFERENCES,
      );
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      const roundingPosting = postings.find((posting) => posting.accountId === roundingAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(vatPosting);
      assertNonNullish(roundingPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(4);
      expect(revenuePosting.credit).toBe(506n);
      expect(vatPosting.credit).toBe(34n);
      expect(roundingPosting.credit).toBe(1n);
      expect(receivablePosting.debit).toBe(541n);
      expect(revenuePosting.credit + vatPosting.credit + roundingPosting.credit).toBe(
        receivablePosting.debit,
      );
    });
    test("books no VAT when the invoice has no VAT rate even if the organization has VAT methods", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
      });
      await createLine(db, invId, "Untaxed item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const vatAccountId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      expect(postings).toHaveLength(2);
      expect(postings.some((posting) => posting.accountId === vatAccountId)).toBeFalse();
      expect(postings.every((posting) => posting.vatRateId === null)).toBeTrue();
    });

    test("returns an error Result when the invoice has a VAT rate but the organization has no VAT methods", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVatRate(vatOrgId);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the invoice VAT rate is not valid on the issue date", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await seedVatSettings(vatOrgId, VatRemunerationMethod.AGREED);
      const vatRateId = await seedVatRate(vatOrgId, VatType.NET_RATE_TAX, new Date("2026-06-01"));

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the invoice VAT rate is not a net rate tax", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await seedVatSettings(vatOrgId, VatRemunerationMethod.AGREED);
      const vatRateId = await seedVatRate(vatOrgId, VatType.NON_TAXABLE_TURNOVER);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Exempt item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });
  });

  describe("VAT with the effective method", () => {
    const seedEffectiveVat = async ({
      organizationId,
      remunerationMethod,
      type = VatType.SALES_TAX_DUE,
    }: {
      organizationId: string;
      remunerationMethod: VatRemunerationMethod;
      type?: VatType;
    }): Promise<string> => {
      await createVatSettings(db, {
        organizationId,
        remunerationMethod,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      const [row] = await db
        .insert(vatRates)
        .values({
          organizationId,
          code: "UN81",
          type,
          rate: 8.1,
          netRate: type === VatType.NET_RATE_TAX ? 6.2 : null,
          startOn: new Date("2026-01-01"),
        })
        .returning();
      assertNonNullish(row);
      return row.id;
    };

    test("books the net amount as revenue and the invoiced VAT on the tax-due account on the agreed method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
      });

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const incomeAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.DEFAULT_INCOME,
      );
      const vatAccountId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(vatPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(3);
      expect(revenuePosting.credit).toBe(10000n);
      expect(vatPosting.credit).toBe(810n);
      expect(receivablePosting.debit).toBe(10810n);
      expect(revenuePosting.vatRateId).toBe(vatRateId);
      expect(vatPosting.vatRateId).toBeNull();
      expect(receivablePosting.vatRateId).toBeNull();
    });

    test("books the invoiced VAT on the vat-remuneration-received account on the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      });

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const vatAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      assertNonNullish(vatPosting);

      expect(vatPosting.credit).toBe(810n);
    });

    test("keeps the ledger balanced when VAT and a rounding difference posting both apply", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
      });

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Fractional taxable item", {
        quantity: 1.5,
        unitPrice: 333n,
      });

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      const incomeAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.DEFAULT_INCOME,
      );
      const vatAccountId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const roundingAccountId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.ROUNDING_DIFFERENCES,
      );
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);

      const revenuePosting = postings.find((posting) => posting.accountId === incomeAccountId);
      const vatPosting = postings.find((posting) => posting.accountId === vatAccountId);
      const roundingPosting = postings.find((posting) => posting.accountId === roundingAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(revenuePosting);
      assertNonNullish(vatPosting);
      assertNonNullish(roundingPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(4);
      expect(revenuePosting.credit).toBe(499n);
      expect(vatPosting.credit).toBe(41n);
      expect(roundingPosting.credit).toBe(1n);
      expect(receivablePosting.debit).toBe(541n);
      expect(revenuePosting.credit + vatPosting.credit + roundingPosting.credit).toBe(
        receivablePosting.debit,
      );
    });

    test("returns an error Result when the invoice VAT rate is a net rate tax", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
        type: VatType.NET_RATE_TAX,
      });

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result for a sales tax rate when the organization uses the net rate method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await createVatSettings(db, {
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.NET_RATE,
      });
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: vatOrgId,
          code: "UN81",
          type: VatType.SALES_TAX_DUE,
          rate: 8.1,
          startOn: new Date("2026-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const invId = await createDraftInvoice(db, {
        organizationId: vatOrgId,
        clientId: vatClientId,
        vatRateId: rate.id,
      });
      await createLine(db, invId, "Taxable item", { unitPrice: 10000n });

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });
  });

  describe("currency propagation", () => {
    test("carries the invoice currency and exchange rate onto every posting", async () => {
      const { orgId: fxOrgId, clientId: fxClientId } = await setUpOrgWithPeriod();

      const invId = await createDraftInvoice(db, {
        organizationId: fxOrgId,
        clientId: fxClientId,
        currency: "EUR",
        exchangeRate: 0.95,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const postings = await loadOpenPostings(invId);
      expect(postings).toHaveLength(2);

      for (const posting of postings) {
        expect(posting.currency).toBe("EUR");
        expect(posting.exchangeRate).toBe(0.95);
      }
    });
  });

  describe("system account guardrails", () => {
    test("returns an error Result when debtor is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.DEBTOR);

      const invId = await createDraftInvoice(db, {
        organizationId: brokenOrgId,
        clientId: brokenClientId,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result when default_income is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.DEFAULT_INCOME);

      const invId = await createDraftInvoice(db, {
        organizationId: brokenOrgId,
        clientId: brokenClientId,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result when rounding_differences is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.ROUNDING_DIFFERENCES);

      const invId = await createDraftInvoice(db, {
        organizationId: brokenOrgId,
        clientId: brokenClientId,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the organization has VAT methods but no matching VAT system account", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();

      await createVatSettings(db, {
        organizationId: brokenOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.NET_RATE,
      });
      const [vatRate] = await db
        .insert(vatRates)
        .values({
          organizationId: brokenOrgId,
          code: "UN81",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2026-01-01"),
        })
        .returning();
      assertNonNullish(vatRate);
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const invId = await createDraftInvoice(db, {
        organizationId: brokenOrgId,
        clientId: brokenClientId,
        vatRateId: vatRate.id,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });
  });

  describe("period guardrails", () => {
    test("returns an error Result when issueOn falls outside any open period", async () => {
      const orphanOrgId = await createOrganization(db, TEST_USER_ID);
      const orphanClientId = await createClient(db, orphanOrgId);

      const invId = await createDraftInvoice(db, {
        organizationId: orphanOrgId,
        clientId: orphanClientId,
      });
      await createLine(db, invId, "Item line");

      const result = await openService(invId).open();
      expect(result.status).toBe("error");
    });
  });

  describe("account balances view refresh", () => {
    test("refreshes ledger.mv_account_balances after opening the invoice", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await createDraftInvoice(db, {
        organizationId: caseOrgId,
        clientId: caseClientId,
      });
      await createLine(db, invId, "Item line");
      const debtorId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);

      const result = await openService(invId).open();
      expect(result.status).toBe("success");

      const row = await waitFor(
        () => readAccountBalance(db, debtorId),
        (balance) => balance?.totalDebit === 1000n,
      );
      expect(row?.totalDebit).toBe(1000n);
      expect(row?.totalCredit).toBe(0n);
      expect(row?.balance).toBe(1000n);
    });
  });
});
