import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  InvoiceStatus,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import type { Services } from "@usenullish/nullish-schema/services";
import { OpenInvoiceService } from "../../../../src/billing/services/invoices/invoice.open";
import { PayInvoiceService } from "../../../../src/billing/services/invoices/invoice.pay";
import type { InvoiceServiceArgs } from "../../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createBankRelation,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  createVatSettings,
  readAccountBalance,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
  waitFor,
} from "../../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const journalPostings = DbSchema.Ledger.Journal.PostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const currencies = DbSchema.Core.Currencies.CurrenciesSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const accountingSettings = DbSchema.Core.Accounting.AccountingSettingsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const openService = (invoiceId: string): OpenInvoiceService =>
  OpenInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const payService = (invoiceId: string): PayInvoiceService =>
  PayInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const makePayment = (
  overrides: Partial<Services["Invoices"]["Pay"]["Args"]> = {},
): Services["Invoices"]["Pay"]["Args"] => ({
  amount: 1000n,
  currency: "CHF",
  exchangeRate: EXCHANGE_RATE_ONE,
  validOn: new Date("2026-03-01"),
  ...overrides,
});

const loadLatestPaymentPostings = async (invId: string) => {
  const [link] = await db
    .select()
    .from(invoiceJournalEntries)
    .where(
      and(
        eq(invoiceJournalEntries.invoiceId, invId),
        eq(invoiceJournalEntries.type, InvoiceJournalEntryType.PAYMENT),
      ),
    )
    .orderBy(desc(invoiceJournalEntries.createdAt))
    .limit(1);
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

const seedVat = async (
  organizationId: string,
  remunerationMethod: VatRemunerationMethod,
): Promise<string> => {
  await createVatSettings(db, {
    organizationId,
    remunerationMethod,
    paymentMethod: VatPaymentMethod.NET_RATE,
  });

  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: "UN81",
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: new Date("2026-01-01"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const seedEffectiveVat = async ({
  organizationId,
  remunerationMethod,
}: {
  organizationId: string;
  remunerationMethod: VatRemunerationMethod;
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
      type: VatType.SALES_TAX_DUE,
      rate: 8.1,
      startOn: new Date("2026-01-01"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const openInvoice = async (
  organizationId: string,
  clientId: string,
  overrides: {
    currency?: string;
    exchangeRate?: number;
    quantity?: number;
    unitPrice?: bigint;
    vatRateId?: string;
  } = {},
): Promise<string> => {
  const invId = await createDraftInvoice(db, {
    organizationId,
    clientId,
    currency: overrides.currency,
    exchangeRate: overrides.exchangeRate,
    vatRateId: overrides.vatRateId,
  });
  await createLine(db, invId, "Item line", {
    quantity: overrides.quantity,
    unitPrice: overrides.unitPrice,
  });

  const result = await openService(invId).open();
  if (result.status !== "success") {
    throw new Error(`Failed to open invoice ${invId} for test setup`);
  }

  return invId;
};

describe("PayInvoiceService", () => {
  let orgId: string;
  let clientId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    ({ orgId, clientId } = await setUpOrgWithPeriod());
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("lifecycle", () => {
    test("pays a fully-open invoice in one shot and rejects a second payment attempt", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const bankAccountId = await getSystemAccountId(orgId, SystemAccountPurpose.BANK_ACCOUNT);
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);

      const bankPosting = postings.find((posting) => posting.accountId === bankAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      assertNonNullish(bankPosting);
      assertNonNullish(receivablePosting);

      expect(postings).toHaveLength(2);
      expect(bankPosting.debit).toBe(1000n);
      expect(receivablePosting.credit).toBe(1000n);

      const second = await payService(invId).pay(makePayment({ amount: 1n }));
      expect(second.status).toBe("error");
    });

    test("keeps the invoice open after a partial payment", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(makePayment({ amount: 400n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.OPEN);

      const postings = await loadLatestPaymentPostings(invId);
      expect(postings).toHaveLength(2);
    });

    test("returns an error Result when the invoice has not been opened yet", async () => {
      const invId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invId, "Item line");

      const result = await payService(invId).pay(makePayment());
      expect(result.status).toBe("error");
    });
  });

  describe("overpayment", () => {
    test("books the excess on the short-term-debts account in a single overpayment", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(makePayment({ amount: 1500n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const bankAccountId = await getSystemAccountId(orgId, SystemAccountPurpose.BANK_ACCOUNT);
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);
      const shortTermDebtsId = await getSystemAccountId(orgId, SystemAccountPurpose.CREDITOR);

      const bankPosting = postings.find((posting) => posting.accountId === bankAccountId);
      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const excessPosting = postings.find((posting) => posting.accountId === shortTermDebtsId);
      assertNonNullish(bankPosting);
      assertNonNullish(receivablePosting);
      assertNonNullish(excessPosting);

      expect(postings).toHaveLength(3);
      expect(bankPosting.debit).toBe(1500n);
      expect(receivablePosting.credit).toBe(1000n);
      expect(excessPosting.credit).toBe(500n);
    });

    test("caps the excess to what remains due after a prior partial payment", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const first = await payService(invId).pay(makePayment({ amount: 400n }));
      expect(first.status).toBe("success");

      const second = await payService(invId).pay(makePayment({ amount: 800n }));
      expect(second.status).toBe("success");
      if (second.status !== "success") return;
      expect(second.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);
      const shortTermDebtsId = await getSystemAccountId(orgId, SystemAccountPurpose.CREDITOR);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const excessPosting = postings.find((posting) => posting.accountId === shortTermDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(excessPosting);

      expect(receivablePosting.credit).toBe(600n);
      expect(excessPosting.credit).toBe(200n);
    });
  });

  describe("bank relation", () => {
    test("books the payment on the ledger account of the bank relation", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });
      const bankRelationId = await createBankRelation(db, orgId);
      const [bankRelation] = await db
        .select()
        .from(bankRelations)
        .where(eq(bankRelations.id, bankRelationId));
      assertNonNullish(bankRelation);

      const result = await payService(invId).pay(makePayment({ amount: 1000n, bankRelationId }));
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const bankPosting = postings.find((posting) => posting.debit === 1000n);
      assertNonNullish(bankPosting);

      expect(bankPosting.accountId).toBe(bankRelation.accountId);
    });

    test("books the payment on the bank_account system account without a bank relation", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(
        makePayment({ amount: 1000n, bankRelationId: null }),
      );
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const bankPosting = postings.find((posting) => posting.debit === 1000n);
      assertNonNullish(bankPosting);

      expect(bankPosting.accountId).toBe(
        await getSystemAccountId(orgId, SystemAccountPurpose.BANK_ACCOUNT),
      );
    });

    test("returns an error Result and keeps the invoice open for an unknown bank relation", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(
        makePayment({ amount: 1000n, bankRelationId: TEST_MISSING_ID }),
      );
      expect(result.status).toBe("error");

      const payments = await db
        .select()
        .from(invoiceJournalEntries)
        .where(
          and(
            eq(invoiceJournalEntries.invoiceId, invId),
            eq(invoiceJournalEntries.type, InvoiceJournalEntryType.PAYMENT),
          ),
        );
      expect(payments).toHaveLength(0);
    });
  });

  describe("currency and rate guardrails", () => {
    test("returns an error Result when the payment currency does not match the invoice currency", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(makePayment({ amount: 1000n, currency: "EUR" }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the payment matches the base currency but the exchange rate is not 1", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await payService(invId).pay(
        makePayment({ amount: 1000n, currency: "CHF", exchangeRate: 1.5 }),
      );
      expect(result.status).toBe("error");
    });
  });

  describe("system account guardrails", () => {
    test("returns an error Result when debtor is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.DEBTOR);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when bank_account is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.BANK_ACCOUNT);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when creditor is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.CREDITOR);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when exchange_rate_losses is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.EXCHANGE_RATE_LOSSES);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when exchange_rate_gains is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.EXCHANGE_RATE_GAINS);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the organization has no accounting settings", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await db.delete(accountingSettings).where(eq(accountingSettings.organizationId, brokenOrgId));

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("error");
    });
  });

  describe("VAT", () => {
    test("books no VAT-specific postings on payment under the agreed method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 10810n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      expect(postings).toHaveLength(2);
    });

    test("pays an invoice without a VAT rate under the received method with no VAT postings", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 10000n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      expect(postings).toHaveLength(2);
      expect(postings.every((posting) => posting.vatRateId === null)).toBeTrue();
    });

    test("returns an error Result when the received method's VAT system account is missing", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });
      await removeSystemAccount(vatOrgId, SystemAccountPurpose.VAT_REMUNERATION_RECEIVED);

      const result = await payService(invId).pay(makePayment({ amount: 10810n }));
      expect(result.status).toBe("error");
    });

    test("books the full proportional VAT due on a single full payment under the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 10810n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );
      const vatTaxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const vatRemunerationPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      const vatTaxDuePosting = postings.find((posting) => posting.accountId === vatTaxDueId);
      assertNonNullish(vatRemunerationPosting);
      assertNonNullish(vatTaxDuePosting);

      expect(postings).toHaveLength(4);
      expect(vatRemunerationPosting.debit).toBe(670n);
      expect(vatTaxDuePosting.credit).toBe(670n);
      expect(vatRemunerationPosting.vatRateId).toBe(vatRateId);
      expect(vatTaxDuePosting.vatRateId).toBe(vatRateId);
      expect(postings.filter((posting) => posting.vatRateId === null)).toHaveLength(2);
    });

    test("splits the proportional VAT due across two partial payments without double counting", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });
      const vatTaxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const first = await payService(invId).pay(makePayment({ amount: 5000n }));
      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      expect(first.result.status).toBe(InvoiceStatus.OPEN);

      const firstPostings = await loadLatestPaymentPostings(invId);
      const firstVatTaxDuePosting = firstPostings.find(
        (posting) => posting.accountId === vatTaxDueId,
      );
      assertNonNullish(firstVatTaxDuePosting);
      expect(firstVatTaxDuePosting.credit).toBe(310n);

      const second = await payService(invId).pay(makePayment({ amount: 5810n }));
      expect(second.status).toBe("success");
      if (second.status !== "success") return;
      expect(second.result.status).toBe(InvoiceStatus.PAID);

      const secondPostings = await loadLatestPaymentPostings(invId);
      const secondVatTaxDuePosting = secondPostings.find(
        (posting) => posting.accountId === vatTaxDueId,
      );
      assertNonNullish(secondVatTaxDuePosting);
      expect(secondVatTaxDuePosting.credit).toBe(360n);
    });

    test("caps the recognized VAT at the invoice's total VAT due on overpayment", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 20000n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const vatTaxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const shortTermDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.CREDITOR);

      const vatTaxDuePosting = postings.find((posting) => posting.accountId === vatTaxDueId);
      const excessPosting = postings.find((posting) => posting.accountId === shortTermDebtsId);
      assertNonNullish(vatTaxDuePosting);
      assertNonNullish(excessPosting);

      expect(postings).toHaveLength(5);
      expect(vatTaxDuePosting.credit).toBe(670n);
      expect(excessPosting.credit).toBe(9190n);
    });
  });

  describe("VAT with the effective method", () => {
    test("books no VAT-specific postings on payment under the agreed method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.AGREED,
      });

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 10810n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      expect(postings).toHaveLength(2);
    });

    test("moves the whole invoiced VAT to tax due on a single full payment under the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      });

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await payService(invId).pay(makePayment({ amount: 10810n }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.PAID);

      const postings = await loadLatestPaymentPostings(invId);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );
      const vatTaxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const vatRemunerationPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      const vatTaxDuePosting = postings.find((posting) => posting.accountId === vatTaxDueId);
      assertNonNullish(vatRemunerationPosting);
      assertNonNullish(vatTaxDuePosting);

      expect(postings).toHaveLength(4);
      expect(vatRemunerationPosting.debit).toBe(810n);
      expect(vatTaxDuePosting.credit).toBe(810n);
      expect(vatRemunerationPosting.vatRateId).toBe(vatRateId);
      expect(vatTaxDuePosting.vatRateId).toBe(vatRateId);
    });

    test("splits the invoiced VAT across two partial payments under the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      });

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });
      const vatTaxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const first = await payService(invId).pay(makePayment({ amount: 5000n }));
      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      expect(first.result.status).toBe(InvoiceStatus.OPEN);

      const firstPostings = await loadLatestPaymentPostings(invId);
      const firstVatTaxDuePosting = firstPostings.find(
        (posting) => posting.accountId === vatTaxDueId,
      );
      assertNonNullish(firstVatTaxDuePosting);
      expect(firstVatTaxDuePosting.credit).toBe(375n);

      const second = await payService(invId).pay(makePayment({ amount: 5810n }));
      expect(second.status).toBe("success");
      if (second.status !== "success") return;
      expect(second.result.status).toBe(InvoiceStatus.PAID);

      const secondPostings = await loadLatestPaymentPostings(invId);
      const secondVatTaxDuePosting = secondPostings.find(
        (posting) => posting.accountId === vatTaxDueId,
      );
      assertNonNullish(secondVatTaxDuePosting);
      expect(secondVatTaxDuePosting.credit).toBe(435n);
    });
  });

  describe("exchange rate differences", () => {
    test("adds no exchange-rate posting when the rate is unchanged since the invoice", async () => {
      const { orgId: fxOrgId, clientId: fxClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(fxOrgId, fxClientId, {
        currency: "EUR",
        exchangeRate: 1.2,
        unitPrice: 1000n,
      });

      const result = await payService(invId).pay(
        makePayment({ amount: 1000n, currency: "EUR", exchangeRate: 1.2 }),
      );
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      expect(postings).toHaveLength(2);
    });

    test("books a balanced gain or loss when the rate moves between invoice and payment", async () => {
      const { orgId: fxOrgId, clientId: fxClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(fxOrgId, fxClientId, {
        currency: "EUR",
        exchangeRate: 1.05,
        unitPrice: 100000n,
      });

      const result = await payService(invId).pay(
        makePayment({ amount: 100000n, currency: "EUR", exchangeRate: 0.95 }),
      );
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const lossesAccountId = await getSystemAccountId(
        fxOrgId,
        SystemAccountPurpose.EXCHANGE_RATE_LOSSES,
      );
      const lossPosting = postings.find((posting) => posting.accountId === lossesAccountId);
      assertNonNullish(lossPosting);

      expect(postings).toHaveLength(3);
      expect(lossPosting.debit).toBe(10000n);
      expect(lossPosting.currency).toBe("CHF");
    });

    test("books the loss in the smallest unit of the base currency for a currency without decimals", async () => {
      await db.insert(currencies).values({ code: "JPY", decimals: 0 }).onConflictDoNothing();

      const { orgId: fxOrgId, clientId: fxClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(fxOrgId, fxClientId, {
        currency: "JPY",
        exchangeRate: 0.0055,
        unitPrice: 100000n,
      });

      const result = await payService(invId).pay(
        makePayment({ amount: 100000n, currency: "JPY", exchangeRate: 0.005 }),
      );
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const lossesAccountId = await getSystemAccountId(
        fxOrgId,
        SystemAccountPurpose.EXCHANGE_RATE_LOSSES,
      );
      const lossPosting = postings.find((posting) => posting.accountId === lossesAccountId);
      assertNonNullish(lossPosting);

      expect(postings).toHaveLength(3);
      expect(lossPosting.debit).toBe(5000n);
      expect(lossPosting.currency).toBe("CHF");
    });

    test("books a gain of a whole currency unit when the converted payment is a fraction of one", async () => {
      const { orgId: fxOrgId, clientId: fxClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(fxOrgId, fxClientId, {
        currency: "EUR",
        exchangeRate: EXCHANGE_RATE_ONE,
        unitPrice: 1n,
      });

      const result = await payService(invId).pay(
        makePayment({ amount: 1n, currency: "EUR", exchangeRate: 1.5 }),
      );
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const gainsAccountId = await getSystemAccountId(
        fxOrgId,
        SystemAccountPurpose.EXCHANGE_RATE_GAINS,
      );
      const gainPosting = postings.find((posting) => posting.accountId === gainsAccountId);
      assertNonNullish(gainPosting);

      expect(postings).toHaveLength(3);
      expect(gainPosting.credit).toBe(1n);
      expect(gainPosting.currency).toBe("CHF");
    });
  });

  describe("exchange rates and rounding differences", () => {
    test("creates exchange rate gain/loss postings when payment exchange rate differs from invoice rate", async () => {
      const invId = await openInvoice(orgId, clientId, {
        currency: "EUR",
        exchangeRate: 0.95,
        unitPrice: 10000n,
      });

      const result = await payService(invId).pay(
        makePayment({
          currency: "EUR",
          exchangeRate: 1.05,
          amount: 10000n,
        }),
      );

      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const gainAccountId = await getSystemAccountId(
        orgId,
        SystemAccountPurpose.EXCHANGE_RATE_GAINS,
      );

      const gainPosting = postings.find((p) => p.accountId === gainAccountId);
      assertNonNullish(gainPosting);

      expect(gainPosting.credit).toBe(1000n);
      expect(gainPosting.debit).toBe(0n);
    });

    test("generates rounding difference postings when base currency conversion produces odd centime splits", async () => {
      const invId = await openInvoice(orgId, clientId, {
        currency: "EUR",
        exchangeRate: 0.88,
        unitPrice: 10000n,
      });

      const result = await payService(invId).pay(
        makePayment({
          currency: "EUR",
          exchangeRate: 0.91,
          amount: 10000n,
        }),
      );

      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const roundingAccountId = await getSystemAccountId(
        orgId,
        SystemAccountPurpose.ROUNDING_DIFFERENCES,
      );

      const roundingPosting = postings.find((p) => p.accountId === roundingAccountId);

      const calculateBaseAmount = (p: (typeof postings)[number]) => {
        const rate = Math.round(p.exchangeRate * 100000);
        return Math.round((Number(p.debit - p.credit) * rate) / 100000);
      };

      const baseSum = postings.reduce((sum, p) => sum + calculateBaseAmount(p), 0);
      expect(baseSum).toBe(0);

      if (roundingPosting) {
        expect(roundingPosting.exchangeRate).toBe(1);
      }
    });

    test("handles exchange rate loss with partial payment correctly", async () => {
      const invId = await openInvoice(orgId, clientId, {
        currency: "EUR",
        exchangeRate: 1.1,
        unitPrice: 20000n,
      });

      const result = await payService(invId).pay(
        makePayment({
          currency: "EUR",
          exchangeRate: 1.0,
          amount: 10000n,
        }),
      );

      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const lossAccountId = await getSystemAccountId(
        orgId,
        SystemAccountPurpose.EXCHANGE_RATE_LOSSES,
      );

      const lossPosting = postings.find((p) => p.accountId === lossAccountId);
      assertNonNullish(lossPosting);

      expect(lossPosting.debit).toBe(1000n);
      expect(lossPosting.credit).toBe(0n);
    });
  });

  describe("More VAT handling", () => {
    test("calculates proportional VAT correctly across multiple partial payments", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const taxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const remRecId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      // Payment 1: 50.00 CHF partial
      const pay1Result = await payService(invId).pay(makePayment({ amount: 5000n }));
      expect(pay1Result.status).toBe("success");

      const postings1 = await loadLatestPaymentPostings(invId);
      const vatRem1 = postings1.find((p) => p.accountId === remRecId);
      const vatTax1 = postings1.find((p) => p.accountId === taxDueId);

      assertNonNullish(vatRem1);
      assertNonNullish(vatTax1);
      expect(vatRem1.debit).toBe(310n);
      expect(vatTax1.credit).toBe(310n);

      // Payment 2: Pay total remaining TTC balance (10810 total - 5000 paid = 5810)
      const pay2Result = await payService(invId).pay(makePayment({ amount: 5810n }));
      expect(pay2Result.status).toBe("success");
      if (pay2Result.status !== "success") return;
      expect(pay2Result.result.status).toBe(InvoiceStatus.PAID);

      const postings2 = await loadLatestPaymentPostings(invId);
      const vatRem2 = postings2.find((p) => p.accountId === remRecId);
      const vatTax2 = postings2.find((p) => p.accountId === taxDueId);

      assertNonNullish(vatRem2);
      assertNonNullish(vatTax2);
      expect(vatRem2.debit).toBe(360n);
      expect(vatTax2.credit).toBe(360n);
    });

    test("caps cumulative VAT and does not generate additional VAT postings on overpayment", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10800n });

      const taxDueId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);
      const remRecId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      const result = await payService(invId).pay(makePayment({ amount: 15000n }));
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      const vatRem = postings.find((p) => p.accountId === remRecId);
      const vatTax = postings.find((p) => p.accountId === taxDueId);

      assertNonNullish(vatRem);
      assertNonNullish(vatTax);

      expect(vatRem.debit).toBe(724n);
      expect(vatTax.credit).toBe(724n);
    });

    test("does NOT add VAT postings on payment when remuneration method is AGREED (prestations convenues)", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      // AGREED method: VAT was already booked when the invoice was opened
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 1000n });

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("success");

      const postings = await loadLatestPaymentPostings(invId);
      // Only 2 postings expected: Bank Debit + Debtor Credit (no VAT postings)
      expect(postings).toHaveLength(2);
    });
  });

  describe("account balances view refresh", () => {
    test("refreshes ledger.mv_account_balances after a payment", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 1000n });
      const debtorId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);

      const result = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(result.status).toBe("success");

      const row = await waitFor(
        () => readAccountBalance(db, debtorId),
        (balance) => balance?.totalCredit === 1000n && balance?.balance === 0n,
      );
      expect(row?.totalDebit).toBe(1000n);
      expect(row?.totalCredit).toBe(1000n);
      expect(row?.balance).toBe(0n);
    });
  });
});
