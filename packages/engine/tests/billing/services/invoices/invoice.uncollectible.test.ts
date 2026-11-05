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
import { UncollectibleInvoiceService } from "../../../../src/billing/services/invoices/invoice.uncollectible";
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
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const journalPostings = DbSchema.Ledger.Journal.PostingsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;

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

const uncollectibleService = (invoiceId: string): UncollectibleInvoiceService =>
  UncollectibleInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const makeArgs = (
  overrides: Partial<Services["Invoices"]["Uncollectible"]["Args"]> = {},
): Services["Invoices"]["Uncollectible"]["Args"] => ({
  validOn: new Date("2026-03-01"),
  ...overrides,
});

const makePayment = (
  overrides: Partial<Services["Invoices"]["Pay"]["Args"]> = {},
): Services["Invoices"]["Pay"]["Args"] => ({
  amount: 1000n,
  currency: "CHF",
  exchangeRate: EXCHANGE_RATE_ONE,
  validOn: new Date("2026-02-01"),
  ...overrides,
});

const loadUncollectiblePostings = async (invId: string) => {
  const [link] = await db
    .select()
    .from(invoiceJournalEntries)
    .where(
      and(
        eq(invoiceJournalEntries.invoiceId, invId),
        eq(invoiceJournalEntries.type, InvoiceJournalEntryType.UNCOLLECTIBLE),
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

describe("UncollectibleInvoiceService", () => {
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
    test("writes off a fully-open invoice with no payments and rejects a second write-off", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.UNCOLLECTIBLE);

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(orgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(orgId, SystemAccountPurpose.BAD_DEBTS);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);

      expect(postings).toHaveLength(2);
      expect(receivablePosting.credit).toBe(1000n);
      expect(badDebtPosting.debit).toBe(1000n);

      const second = await uncollectibleService(invId).writeOff(makeArgs());
      expect(second.status).toBe("error");
    });

    test("returns an error Result when the invoice has not been opened yet", async () => {
      const invId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invId, "Item line");

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the invoice is already paid", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const paid = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(paid.status).toBe("success");

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });

    test("records a uncollectible journal link on the invoice", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const links = await db
        .select()
        .from(invoiceJournalEntries)
        .where(
          and(
            eq(invoiceJournalEntries.invoiceId, invId),
            eq(invoiceJournalEntries.type, InvoiceJournalEntryType.UNCOLLECTIBLE),
          ),
        );
      expect(links).toHaveLength(1);
    });

    test("defaults validOn to the current date when passed null", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs({ validOn: null }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.UNCOLLECTIBLE);

      const postings = await loadUncollectiblePostings(invId);
      expect(postings).toHaveLength(2);
    });
  });

  describe("remaining receivable", () => {
    test("books the whole open balance to bad debts when nothing was paid", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 2500n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.BAD_DEBTS);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);

      expect(receivablePosting.credit).toBe(2500n);
      expect(badDebtPosting.debit).toBe(2500n);
    });

    test("reduces the bad debt loss by a prior partial payment", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 1000n });

      const partial = await payService(invId).pay(makePayment({ amount: 400n }));
      expect(partial.status).toBe("success");
      if (partial.status !== "success") return;
      expect(partial.result.status).toBe(InvoiceStatus.OPEN);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.BAD_DEBTS);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);

      expect(postings).toHaveLength(2);
      expect(receivablePosting.credit).toBe(600n);
      expect(badDebtPosting.debit).toBe(600n);
    });
  });

  describe("VAT received method", () => {
    test("reverses the full unrealized VAT and books the net loss to bad debts", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.UNCOLLECTIBLE);

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      const vatReversalPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);
      assertNonNullish(vatReversalPosting);

      expect(postings).toHaveLength(3);
      expect(receivablePosting.credit).toBe(10810n);
      expect(vatReversalPosting.debit).toBe(670n);
      expect(badDebtPosting.debit).toBe(10140n);
      expect(vatReversalPosting.vatRateId).toBe(vatRateId);
      expect(receivablePosting.vatRateId).toBeNull();
      expect(badDebtPosting.vatRateId).toBeNull();
    });

    test("reverses only the VAT not yet realized through a partial payment", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const partial = await payService(invId).pay(makePayment({ amount: 5000n }));
      expect(partial.status).toBe("success");
      if (partial.status !== "success") return;
      expect(partial.result.status).toBe(InvoiceStatus.OPEN);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      const vatReversalPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);
      assertNonNullish(vatReversalPosting);

      expect(postings).toHaveLength(3);
      expect(receivablePosting.credit).toBe(5810n);
      expect(vatReversalPosting.debit).toBe(360n);
      expect(badDebtPosting.debit).toBe(5450n);
    });

    test("writes off an invoice without a VAT rate with no VAT reversal", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { unitPrice: 10000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);

      expect(postings).toHaveLength(2);
      expect(receivablePosting.credit).toBe(10000n);
      expect(badDebtPosting.debit).toBe(10000n);
    });

    test("returns an error Result when vat_remuneration_received is missing", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });
      await removeSystemAccount(vatOrgId, SystemAccountPurpose.VAT_REMUNERATION_RECEIVED);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });

    test("returns an error Result when vat_tax_due is missing", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.RECEIVED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });
      await removeSystemAccount(vatOrgId, SystemAccountPurpose.VAT_TAX_DUE);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });
  });

  describe("VAT agreed method", () => {
    test("books no VAT reversal because the tax was already claimed at issuance", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedVat(vatOrgId, VatRemunerationMethod.AGREED);

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 1000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.UNCOLLECTIBLE);

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);

      expect(postings).toHaveLength(2);
      expect(receivablePosting.credit).toBe(1081n);
      expect(badDebtPosting.debit).toBe(1081n);
    });
  });

  describe("VAT with the effective method", () => {
    test("reverses the whole invoiced VAT and books the net amount to bad debts under the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      });

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.UNCOLLECTIBLE);

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      const vatReversalPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);
      assertNonNullish(vatReversalPosting);

      expect(postings).toHaveLength(3);
      expect(receivablePosting.credit).toBe(10810n);
      expect(vatReversalPosting.debit).toBe(810n);
      expect(badDebtPosting.debit).toBe(10000n);
    });

    test("reverses only the invoiced VAT not yet realized through a partial payment under the received method", async () => {
      const { orgId: vatOrgId, clientId: vatClientId } = await setUpOrgWithPeriod();
      const vatRateId = await seedEffectiveVat({
        organizationId: vatOrgId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      });

      const invId = await openInvoice(vatOrgId, vatClientId, { vatRateId, unitPrice: 10000n });

      const partial = await payService(invId).pay(makePayment({ amount: 5000n }));
      expect(partial.status).toBe("success");

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("success");

      const postings = await loadUncollectiblePostings(invId);
      const accountsReceivableId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.DEBTOR);
      const badDebtsId = await getSystemAccountId(vatOrgId, SystemAccountPurpose.BAD_DEBTS);
      const vatRemunerationReceivedId = await getSystemAccountId(
        vatOrgId,
        SystemAccountPurpose.VAT_REMUNERATION_RECEIVED,
      );

      const receivablePosting = postings.find(
        (posting) => posting.accountId === accountsReceivableId,
      );
      const badDebtPosting = postings.find((posting) => posting.accountId === badDebtsId);
      const vatReversalPosting = postings.find(
        (posting) => posting.accountId === vatRemunerationReceivedId,
      );
      assertNonNullish(receivablePosting);
      assertNonNullish(badDebtPosting);
      assertNonNullish(vatReversalPosting);

      expect(postings).toHaveLength(3);
      expect(receivablePosting.credit).toBe(5810n);
      expect(vatReversalPosting.debit).toBe(435n);
      expect(badDebtPosting.debit).toBe(5375n);
    });
  });

  describe("system account guardrails", () => {
    test("returns an error Result when debtor is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.DEBTOR);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });

    test("returns an error Result when bad_debts is missing", async () => {
      const { orgId: brokenOrgId, clientId: brokenClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(brokenOrgId, brokenClientId, { unitPrice: 1000n });
      await removeSystemAccount(brokenOrgId, SystemAccountPurpose.BAD_DEBTS);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
      expect(result.status).toBe("error");
    });
  });

  describe("account balances view refresh", () => {
    test("refreshes ledger.mv_account_balances after the write-off", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 1000n });
      const debtorId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);

      const result = await uncollectibleService(invId).writeOff(makeArgs());
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
