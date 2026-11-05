import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  InvoiceJournalEntryType,
  InvoiceStatus,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import { OpenInvoiceService } from "../../../../src/billing/services/invoices/invoice.open";
import { ReconcileInvoiceService } from "../../../../src/billing/services/invoices/invoice.reconcile";
import type { InvoiceServiceArgs } from "../../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  TEST_USER_ID,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  randomDedupeHash,
  resetDb,
  seedUsers,
} from "../../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const openService = (invoiceId: string): OpenInvoiceService =>
  OpenInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

const reconcileService = (invoiceId: string): ReconcileInvoiceService =>
  ReconcileInvoiceService.create({
    db: db as unknown as InvoiceServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
  });

describe("ReconcileInvoiceService", () => {
  let orgId: string;
  let clientId: string;
  let bankRelationId: string;
  let bankLedgerAccountId: string;
  let systemBankLedgerAccountId: string;
  let statementId: string;

  const openInvoice = async (): Promise<string> => {
    const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, invoiceId, "Item line", { unitPrice: 1000n });

    const result = await openService(invoiceId).open();
    if (result.status !== "success") {
      throw new Error(`Failed to open invoice ${invoiceId} for test setup`);
    }

    return invoiceId;
  };

  const createMovement = async ({
    amount,
    currency = "CHF",
    status = BankMovementStatus.UNRECONCILED,
  }: {
    amount: bigint;
    currency?: string;
    status?: BankMovementStatus;
  }): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId: orgId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount,
        currency,
        status,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const loadInvoiceStatus = async (invoiceId: string): Promise<string> => {
    const [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    assertNonNullish(row);
    return row.status;
  };

  const loadMovement = async (movementId: string) => {
    const [row] = await db.select().from(movements).where(eq(movements.id, movementId));
    assertNonNullish(row);
    return row;
  };

  const loadPaymentJournalEntryId = async (invoiceId: string): Promise<string> => {
    const [link] = await db
      .select()
      .from(invoiceJournalEntries)
      .where(
        and(
          eq(invoiceJournalEntries.invoiceId, invoiceId),
          eq(invoiceJournalEntries.type, InvoiceJournalEntryType.PAYMENT),
        ),
      );
    assertNonNullish(link);
    return link.journalEntryId;
  };

  const countPayments = async (invoiceId: string): Promise<number> => {
    const links = await db
      .select()
      .from(invoiceJournalEntries)
      .where(
        and(
          eq(invoiceJournalEntries.invoiceId, invoiceId),
          eq(invoiceJournalEntries.type, InvoiceJournalEntryType.PAYMENT),
        ),
      );
    return links.length;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    clientId = await createClient(db, orgId);

    const [systemBankRelation] = await db
      .select()
      .from(systemAccounts)
      .where(
        and(
          eq(systemAccounts.organizationId, orgId),
          eq(systemAccounts.purpose, SystemAccountPurpose.BANK_ACCOUNT),
        ),
      );
    assertNonNullish(systemBankRelation);
    systemBankLedgerAccountId = systemBankRelation.accountId;

    const assetAccounts = await db
      .select({ id: accounts.id, parentId: accounts.parentId })
      .from(accounts)
      .where(and(eq(accounts.organizationId, orgId), eq(accounts.type, AccountType.ASSET)));
    const parentIds = new Set(assetAccounts.map(({ parentId }) => parentId));
    const ledgerAccount = assetAccounts.find(
      ({ id }) => !parentIds.has(id) && id !== systemBankLedgerAccountId,
    );
    assertNonNullish(ledgerAccount);
    bankLedgerAccountId = ledgerAccount.id;

    const [bankRelation] = await db
      .insert(bankRelations)
      .values({
        organizationId: orgId,
        name: "Main bank",
        iban: "CH9300762011623852957",
        currency: "CHF",
        accountId: bankLedgerAccountId,
      })
      .returning();
    assertNonNullish(bankRelation);
    bankRelationId = bankRelation.id;

    statementId = await createBankStatement(db, { organizationId: orgId, bankRelationId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("payment", () => {
    test("pays the invoice in full on the ledger account of the bank relation", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.id).toBe(movementId);
      expect(result.result.status).toBe(BankMovementStatus.RECONCILED);
      expect(await loadInvoiceStatus(invoiceId)).toBe(InvoiceStatus.PAID);

      const journalEntryId = await loadPaymentJournalEntryId(invoiceId);
      const rows = await db
        .select()
        .from(postings)
        .where(eq(postings.journalEntryId, journalEntryId));

      const bankPosting = rows.find(({ accountId }) => accountId === bankLedgerAccountId);
      assertNonNullish(bankPosting);
      expect(bankPosting.debit).toBe(1000n);
      expect(rows.some(({ accountId }) => accountId === systemBankLedgerAccountId)).toBeFalse();
    });

    test("keeps the invoice open after a partial payment", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 400n });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("success");
      expect(await loadInvoiceStatus(invoiceId)).toBe(InvoiceStatus.OPEN);
    });

    test("dates the payment on the booking date of the movement", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n });

      await reconcileService(invoiceId).reconcile({ movementId });

      const journalEntryId = await loadPaymentJournalEntryId(invoiceId);
      const [entry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, journalEntryId));
      assertNonNullish(entry);
      expect(entry.validOn).toEqual(new Date("2026-10-05"));
    });
  });

  describe("movement", () => {
    test("marks the movement reconciled and links it to the payment journal entry", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n });

      await reconcileService(invoiceId).reconcile({ movementId });

      const movement = await loadMovement(movementId);
      expect(movement.status).toBe(BankMovementStatus.RECONCILED);

      const links = await db
        .select()
        .from(movementJournalEntries)
        .where(eq(movementJournalEntries.movementId, movementId));
      expect(links.map(({ journalEntryId }) => journalEntryId)).toEqual([
        await loadPaymentJournalEntryId(invoiceId),
      ]);
    });
  });

  describe("guardrails", () => {
    test("returns an error Result for a movement already reconciled", async () => {
      const invoiceId = await openInvoice();
      const otherInvoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n });
      await reconcileService(invoiceId).reconcile({ movementId });

      const result = await reconcileService(otherInvoiceId).reconcile({ movementId });

      expect(result.status).toBe("error");
      expect(await countPayments(otherInvoiceId)).toBe(0);
    });

    test("returns an error Result for an ignored movement", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({
        amount: 1000n,
        status: BankMovementStatus.IGNORED,
      });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("error");
      expect(await countPayments(invoiceId)).toBe(0);
    });

    test("returns an error Result for an outgoing movement", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: -1000n });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("error");
      expect((await loadMovement(movementId)).status).toBe(BankMovementStatus.UNRECONCILED);
    });

    test("returns an error Result for a movement in another currency than the base currency", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n, currency: "EUR" });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("error");
      expect((await loadMovement(movementId)).status).toBe(BankMovementStatus.UNRECONCILED);
    });

    test("returns an error Result for an invoice that is not open and leaves the movement unreconciled", async () => {
      const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      await createLine(db, invoiceId, "Item line", { unitPrice: 1000n });
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcileService(invoiceId).reconcile({ movementId });

      expect(result.status).toBe("error");
      expect((await loadMovement(movementId)).status).toBe(BankMovementStatus.UNRECONCILED);
    });
  });
});
