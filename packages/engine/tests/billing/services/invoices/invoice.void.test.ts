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
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import type { Services } from "@usenullish/nullish-schema/services";
import { OpenInvoiceService } from "../../../../src/billing/services/invoices/invoice.open";
import { PayInvoiceService } from "../../../../src/billing/services/invoices/invoice.pay";
import { VoidInvoiceService } from "../../../../src/billing/services/invoices/invoice.void";
import type { InvoiceServiceArgs } from "../../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  readAccountBalance,
  resetDb,
  seedUsers,
  waitFor,
  TEST_USER_ID,
} from "../../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const journalPostings = DbSchema.Ledger.Journal.PostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

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

const voidService = (invoiceId: string): VoidInvoiceService =>
  VoidInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const makeArgs = (
  overrides: Partial<Services["Invoices"]["Void"]["Args"]> = {},
): Services["Invoices"]["Void"]["Args"] => ({
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

const loadPostingsByType = async (invId: string, type: InvoiceJournalEntryType) => {
  const [link] = await db
    .select()
    .from(invoiceJournalEntries)
    .where(and(eq(invoiceJournalEntries.invoiceId, invId), eq(invoiceJournalEntries.type, type)))
    .orderBy(desc(invoiceJournalEntries.createdAt))
    .limit(1);
  assertNonNullish(link);

  const postings = await db
    .select()
    .from(journalPostings)
    .where(eq(journalPostings.journalEntryId, link.journalEntryId));

  return { journalEntryId: link.journalEntryId, postings };
};

const sumDebit = (postings: { debit: bigint }[]): bigint =>
  postings.reduce((total, { debit }) => total + debit, 0n);

const sumCredit = (postings: { credit: bigint }[]): bigint =>
  postings.reduce((total, { credit }) => total + credit, 0n);

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

const openInvoice = async (
  organizationId: string,
  clientId: string,
  overrides: {
    currency?: string;
    exchangeRate?: number;
    quantity?: number;
    unitPrice?: bigint;
  } = {},
): Promise<string> => {
  const invId = await createDraftInvoice(db, {
    organizationId,
    clientId,
    currency: overrides.currency,
    exchangeRate: overrides.exchangeRate,
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

describe("VoidInvoiceService", () => {
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
    test("voids a fully-open invoice and rejects a second void attempt", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.VOID);

      const { postings } = await loadPostingsByType(invId, InvoiceJournalEntryType.VOID);
      expect(postings.length).toBeGreaterThan(0);

      const second = await voidService(invId).void(makeArgs());
      expect(second.status).toBe("error");
    });

    test("returns an error Result when the invoice has not been opened yet", async () => {
      const invId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invId, "Item line");

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("error");
    });

    test("returns an error Result when the invoice is already paid", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const paid = await payService(invId).pay(makePayment({ amount: 1000n }));
      expect(paid.status).toBe("success");

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("error");
    });

    test("records a single void journal link on the invoice", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("success");

      const links = await db
        .select()
        .from(invoiceJournalEntries)
        .where(
          and(
            eq(invoiceJournalEntries.invoiceId, invId),
            eq(invoiceJournalEntries.type, InvoiceJournalEntryType.VOID),
          ),
        );
      expect(links).toHaveLength(1);
    });

    test("defaults validOn to the current date when passed null", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const result = await voidService(invId).void(makeArgs({ validOn: null }));
      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.status).toBe(InvoiceStatus.VOID);
    });
  });

  describe("payment guardrail", () => {
    test("returns an error Result when the invoice has received a partial payment", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      const partial = await payService(invId).pay(makePayment({ amount: 400n }));
      expect(partial.status).toBe("success");
      if (partial.status !== "success") return;
      expect(partial.result.status).toBe(InvoiceStatus.OPEN);

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("error");
    });

    test("leaves the invoice open when the void is rejected for existing payments", async () => {
      const invId = await openInvoice(orgId, clientId, { unitPrice: 1000n });

      await payService(invId).pay(makePayment({ amount: 400n }));
      await voidService(invId).void(makeArgs());

      const [invoice] = await db
        .select()
        .from(DbSchema.Billing.Invoices.InvoicesSchema)
        .where(eq(DbSchema.Billing.Invoices.InvoicesSchema.id, invId));
      assertNonNullish(invoice);
      expect(invoice.status).toBe(InvoiceStatus.OPEN);
    });
  });

  describe("reversing entry", () => {
    test("mirrors every opening posting with debit and credit swapped", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 2500n });

      const { postings: openingPostings } = await loadPostingsByType(
        invId,
        InvoiceJournalEntryType.OPEN,
      );

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("success");

      const { postings: voidPostings } = await loadPostingsByType(
        invId,
        InvoiceJournalEntryType.VOID,
      );

      expect(voidPostings).toHaveLength(openingPostings.length);
      expect(sumDebit(voidPostings)).toBe(sumCredit(openingPostings));
      expect(sumCredit(voidPostings)).toBe(sumDebit(openingPostings));
      expect(sumDebit(voidPostings)).toBe(sumCredit(voidPostings));

      for (const openingPosting of openingPostings) {
        const voidPosting = voidPostings.find(
          (posting) => posting.accountId === openingPosting.accountId,
        );
        assertNonNullish(voidPosting);
        expect(voidPosting.debit).toBe(openingPosting.credit);
        expect(voidPosting.credit).toBe(openingPosting.debit);
        expect(voidPosting.description).toBeNull();
      }
    });

    test("writes no reference on the reversing journal entry", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 1000n });

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("success");

      const { journalEntryId } = await loadPostingsByType(invId, InvoiceJournalEntryType.VOID);
      const [entry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, journalEntryId));
      assertNonNullish(entry);
      expect(entry.reference).toBeNull();
    });

    test("keeps the currency and exchange rate of a foreign-currency invoice", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, {
        currency: "EUR",
        exchangeRate: 1.2,
        unitPrice: 1000n,
      });

      const result = await voidService(invId).void(makeArgs());
      expect(result.status).toBe("success");

      const { postings } = await loadPostingsByType(invId, InvoiceJournalEntryType.VOID);
      for (const posting of postings) {
        expect(posting.currency).toBe("EUR");
        expect(posting.exchangeRate).toBe(1.2);
      }
    });
  });

  describe("account balances view refresh", () => {
    test("refreshes ledger.mv_account_balances after voiding the invoice", async () => {
      const { orgId: caseOrgId, clientId: caseClientId } = await setUpOrgWithPeriod();
      const invId = await openInvoice(caseOrgId, caseClientId, { unitPrice: 1000n });
      const debtorId = await getSystemAccountId(caseOrgId, SystemAccountPurpose.DEBTOR);

      const result = await voidService(invId).void(makeArgs());
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
