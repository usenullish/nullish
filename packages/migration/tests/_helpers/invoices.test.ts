import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createInvoice,
  createInvoiceJournalEntries,
  listInvoiceJournalEntriesByOrgId,
  updateInvoiceStatus,
} from "../../src/_helpers/invoices";
import { createJournal } from "../../src/_helpers/journal";
import {
  accountByCode,
  createClient,
  createOrganization,
  createPeriod,
  createVatRate,
  journalEntryByReference,
  linesByInvoiceId,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withAuthenticatedUser,
  withAuthenticatedUserRolledBack,
  withUser,
  withUserRolledBack,
} from "../../../admin/tests/_test-utils";
import {
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  InvoiceLineType,
  InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish } from "@usenullish/nullish-common";

const instance = await openTestDb();
const db = instance.connection;

describe("invoices services", () => {
  let orgId: string;
  let otherOrgId: string;
  let clientId: string;
  let otherClientId: string;

  const insertInvoice = async ({
    userId = TEST_USER_ID,
    organizationId = orgId,
    invoiceClientId = clientId,
    vatRateId = null,
  }: {
    userId?: string;
    organizationId?: string;
    invoiceClientId?: string;
    vatRateId?: string | null;
  } = {}) => {
    const result = await withUser(db, userId, (tx) =>
      createInvoice({
        tx,
        organizationId,
        invoice: {
          clientId: invoiceClientId,
          issueOn: new Date(Date.UTC(2026, 0, 15)),
          dueOn: new Date(Date.UTC(2026, 1, 15)),
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId,
        },
        lines: [
          {
            type: InvoiceLineType.ITEM,
            description: "Consulting",
            quantity: 2,
            unitPrice: 50000n,
          },
          {
            type: InvoiceLineType.DISCOUNT,
            description: "Loyalty",
            quantity: 1,
            unitPrice: 1000n,
          },
        ],
      }),
    );

    if (result.status === "error") {
      throw result.err;
    }

    return result.result;
  };

  const insertJournalEntry = async ({
    userId = TEST_USER_ID,
    organizationId = orgId,
    reference,
  }: {
    userId?: string;
    organizationId?: string;
    reference: string;
  }) => {
    const bank = await accountByCode(db, organizationId, "1020");
    const debtor = await accountByCode(db, organizationId, "1100");

    const result = await withUser(db, userId, (tx) =>
      createJournal({
        tx,
        organizationId,
        validOn: new Date(Date.UTC(2026, 2, 1)),
        reference,
        postings: [
          {
            accountId: bank.id,
            description: "Bank",
            debit: 99000n,
            credit: 0n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
          },
          {
            accountId: debtor.id,
            description: "Debtor",
            debit: 0n,
            credit: 99000n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
          },
        ],
      }),
    );

    if (result.status === "error") {
      throw result.err;
    }

    return await journalEntryByReference(db, organizationId, reference);
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    clientId = await createClient(db, orgId);
    otherClientId = await createClient(db, otherOrgId);

    for (const [userId, organizationId] of [
      [TEST_USER_ID, orgId],
      [TEST_OTHER_USER_ID, otherOrgId],
    ] as const) {
      await withUser(db, userId, (tx) =>
        createPeriod({
          tx,
          organizationId,
          startOn: new Date(Date.UTC(2026, 0, 1)),
          endOn: new Date(Date.UTC(2026, 11, 31)),
        }),
      );
    }
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("createInvoice", () => {
    test("inserts a draft invoice with its lines and returns it", async () => {
      const invoice = await insertInvoice();

      expect(invoice.organizationId).toBe(orgId);
      expect(invoice.clientId).toBe(clientId);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.issueOn).toEqual(new Date(Date.UTC(2026, 0, 15)));
      expect(invoice.dueOn).toEqual(new Date(Date.UTC(2026, 1, 15)));
      expect(invoice.currency).toBe("CHF");
      expect(invoice.vatRateId).toBeNull();
      expect(invoice.version).toBe(1);

      const lines = await linesByInvoiceId(db, invoice.id);
      expect(lines).toHaveLength(2);
      expect(
        lines.map(({ type, description, unitPrice }) => ({ type, description, unitPrice })),
      ).toEqual(
        expect.arrayContaining([
          { type: InvoiceLineType.ITEM, description: "Consulting", unitPrice: 50000n },
          { type: InvoiceLineType.DISCOUNT, description: "Loyalty", unitPrice: 1000n },
        ]),
      );
    });

    test("stores the given VAT rate", async () => {
      const vatRateId = await createVatRate(db, orgId);

      const invoice = await insertInvoice({ vatRateId });

      expect(invoice.vatRateId).toBe(vatRateId);
    });

    test("returns an error Result when a line is invalid", async () => {
      const result = await withUserRolledBack(db, TEST_USER_ID, (tx) =>
        createInvoice({
          tx,
          organizationId: orgId,
          invoice: {
            clientId,
            issueOn: new Date(Date.UTC(2026, 0, 15)),
            dueOn: null,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
          },
          lines: [
            {
              type: InvoiceLineType.ITEM,
              description: "Negative",
              quantity: 1,
              unitPrice: -1n,
            },
          ],
        }),
      );

      expect(result.status).toBe("error");
    });

    test("returns an error Result for another organization", async () => {
      const result = await withAuthenticatedUserRolledBack(db, TEST_USER_ID, (tx) =>
        createInvoice({
          tx,
          organizationId: otherOrgId,
          invoice: {
            clientId: otherClientId,
            issueOn: new Date(Date.UTC(2026, 0, 15)),
            dueOn: null,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
          },
          lines: [
            {
              type: InvoiceLineType.ITEM,
              description: "Intrusion",
              quantity: 1,
              unitPrice: 1000n,
            },
          ],
        }),
      );

      expect(result.status).toBe("error");
    });
  });

  describe("updateInvoiceStatus", () => {
    test("opens a draft invoice and returns it", async () => {
      const invoice = await insertInvoice();

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateInvoiceStatus({ tx, invoiceId: invoice.id, status: InvoiceStatus.OPEN }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.id).toBe(invoice.id);
      expect(result.result.status).toBe(InvoiceStatus.OPEN);
      expect(result.result.version).toBe(invoice.version + 1);
    });

    test("walks an invoice from draft to paid", async () => {
      const invoice = await insertInvoice();

      const paid = await withUser(db, TEST_USER_ID, async (tx) => {
        await updateInvoiceStatus({ tx, invoiceId: invoice.id, status: InvoiceStatus.OPEN });
        return await updateInvoiceStatus({ tx, invoiceId: invoice.id, status: InvoiceStatus.PAID });
      });

      if (paid.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(paid.result.status).toBe(InvoiceStatus.PAID);
    });

    test("returns an error Result for a transition the status rules forbid", async () => {
      const invoice = await insertInvoice();

      const result = await withUserRolledBack(db, TEST_USER_ID, (tx) =>
        updateInvoiceStatus({ tx, invoiceId: invoice.id, status: InvoiceStatus.PAID }),
      );

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the invoice does not exist", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateInvoiceStatus({ tx, invoiceId: TEST_MISSING_ID, status: InvoiceStatus.OPEN }),
      );

      expect(result.status).toBe("error");
    });

    test("returns an error Result for another organization's invoice", async () => {
      const otherInvoice = await insertInvoice({
        userId: TEST_OTHER_USER_ID,
        organizationId: otherOrgId,
        invoiceClientId: otherClientId,
      });

      const result = await withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        updateInvoiceStatus({ tx, invoiceId: otherInvoice.id, status: InvoiceStatus.OPEN }),
      );

      expect(result.status).toBe("error");
    });
  });

  describe("createInvoiceJournalEntries", () => {
    test("links journal entries to the invoice and returns the links", async () => {
      const invoice = await insertInvoice();
      const first = await insertJournalEntry({ reference: "Facture LINK-1 first" });
      const second = await insertJournalEntry({ reference: "Facture LINK-1 second" });

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          entries: [
            { journalEntryId: first.id, type: InvoiceJournalEntryType.PAYMENT },
            { journalEntryId: second.id, type: InvoiceJournalEntryType.PAYMENT },
          ],
        }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(2);
      expect(result.result.every(({ invoiceId }) => invoiceId === invoice.id)).toBeTrue();
      expect(result.result.map(({ journalEntryId }) => journalEntryId).toSorted()).toEqual(
        [first.id, second.id].toSorted(),
      );
      expect(
        result.result.every(({ type }) => type === InvoiceJournalEntryType.PAYMENT),
      ).toBeTrue();
    });

    test("returns an error Result when a journal entry is already linked", async () => {
      const invoice = await insertInvoice();
      const siblingInvoice = await insertInvoice();
      const entry = await insertJournalEntry({ reference: "Facture LINK-2" });

      await withUser(db, TEST_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          entries: [{ journalEntryId: entry.id, type: InvoiceJournalEntryType.PAYMENT }],
        }),
      );

      const result = await withUserRolledBack(db, TEST_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: siblingInvoice.organizationId,
          invoiceId: siblingInvoice.id,
          entries: [{ journalEntryId: entry.id, type: InvoiceJournalEntryType.PAYMENT }],
        }),
      );

      expect(result.status).toBe("error");
    });

    test("returns an error Result for a second open entry on the same invoice", async () => {
      const invoice = await insertInvoice();
      const first = await insertJournalEntry({ reference: "Facture LINK-3 first" });
      const second = await insertJournalEntry({ reference: "Facture LINK-3 second" });

      const result = await withUserRolledBack(db, TEST_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          entries: [
            { journalEntryId: first.id, type: InvoiceJournalEntryType.OPEN },
            { journalEntryId: second.id, type: InvoiceJournalEntryType.OPEN },
          ],
        }),
      );

      expect(result.status).toBe("error");
    });
  });

  describe("listInvoiceJournalEntriesByOrgId", () => {
    test("returns the journal links of the organization's invoices only", async () => {
      const invoice = await insertInvoice();
      const entry = await insertJournalEntry({ reference: "Facture LIST-1" });

      await withUser(db, TEST_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          entries: [{ journalEntryId: entry.id, type: InvoiceJournalEntryType.PAYMENT }],
        }),
      );

      const otherInvoice = await insertInvoice({
        userId: TEST_OTHER_USER_ID,
        organizationId: otherOrgId,
        invoiceClientId: otherClientId,
      });
      const otherEntry = await insertJournalEntry({
        userId: TEST_OTHER_USER_ID,
        organizationId: otherOrgId,
        reference: "Facture LIST-OTHER",
      });

      await withUser(db, TEST_OTHER_USER_ID, (tx) =>
        createInvoiceJournalEntries({
          tx,
          organizationId: otherInvoice.organizationId,
          invoiceId: otherInvoice.id,
          entries: [{ journalEntryId: otherEntry.id, type: InvoiceJournalEntryType.PAYMENT }],
        }),
      );

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listInvoiceJournalEntriesByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const listed = result.result.find(({ journalEntryId }) => journalEntryId === entry.id);
      assertNonNullish(listed);

      expect(listed.invoiceId).toBe(invoice.id);
      expect(listed.type).toBe(InvoiceJournalEntryType.PAYMENT);
      expect(
        result.result.some(({ journalEntryId }) => journalEntryId === otherEntry.id),
      ).toBeFalse();
    });

    test("returns an empty list for an organization with no invoices", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listInvoiceJournalEntriesByOrgId({ tx, organizationId: TEST_MISSING_ORG_ID }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
