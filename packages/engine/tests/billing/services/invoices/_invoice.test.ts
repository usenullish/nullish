import { describe, expect, test } from "bun:test";
import { SystemAccountPurpose, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import {
  InvoiceService,
  type InvoiceServiceArgs,
} from "../../../../src/billing/services/invoices/_invoice";

type Account = { accountId: string };
type Posting = { accountId: string; debit: bigint; credit: bigint };

class TestInvoiceService extends InvoiceService {
  constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  assertInvoiceStatus(args: { invoice: { id: string; status: string }; status: string }): void {
    return this._assertInvoiceStatus(args as never);
  }

  assertAndMapVatSystemAccounts(args: {
    systemAccounts: Partial<Record<string, Account | undefined>>;
    vatMethods: { remunerationMethod: string } | undefined;
    invoice: { id: string; vatRateId: string | null };
    organizationId: string;
  }): unknown {
    return this._assertAndMapVatSystemAccounts(args as never);
  }

  assertAndMapInvoiceData(args: {
    invoiceAccounts: { receivable: Account };
    invoiceId: string;
    postings: { invoice: Posting[]; payments: Posting[] };
    vatAccounts: { remunerationReceived: Account; taxDue: Account } | null | undefined;
  }): unknown {
    return this._assertAndMapInvoiceData(args as never);
  }
}

const service = new TestInvoiceService({
  db: {} as unknown as InvoiceServiceArgs["db"],
  userId: "test-user" as InvoiceServiceArgs["userId"],
  invoiceId: "test-invoice" as InvoiceServiceArgs["invoiceId"],
});

describe("InvoiceService", () => {
  describe("_assertInvoiceStatus", () => {
    test("does not throw when the status matches", () => {
      expect(() =>
        service.assertInvoiceStatus({ invoice: { id: "inv-1", status: "draft" }, status: "draft" }),
      ).not.toThrow();
    });

    test("throws when the status differs", () => {
      expect(() =>
        service.assertInvoiceStatus({ invoice: { id: "inv-1", status: "open" }, status: "draft" }),
      ).toThrow();
    });
  });

  describe("_assertAndMapVatSystemAccounts", () => {
    test("returns undefined when there are no VAT methods and no invoice vat rate", () => {
      const result = service.assertAndMapVatSystemAccounts({
        systemAccounts: {},
        vatMethods: undefined,
        invoice: { id: "inv-1", vatRateId: null },
        organizationId: "org-1",
      });

      expect(result).toBeUndefined();
    });

    test("throws when there are no VAT methods but the invoice carries a vat rate", () => {
      expect(() =>
        service.assertAndMapVatSystemAccounts({
          systemAccounts: {},
          vatMethods: undefined,
          invoice: { id: "inv-1", vatRateId: "rate-1" },
          organizationId: "org-1",
        }),
      ).toThrow();
    });

    test("returns null on the agreed remuneration method", () => {
      const result = service.assertAndMapVatSystemAccounts({
        systemAccounts: {},
        vatMethods: { remunerationMethod: VatRemunerationMethod.AGREED },
        invoice: { id: "inv-1", vatRateId: "rate-1" },
        organizationId: "org-1",
      });

      expect(result).toBeNull();
    });

    test("throws on the received method when the remuneration-received account is missing", () => {
      expect(() =>
        service.assertAndMapVatSystemAccounts({
          systemAccounts: { [SystemAccountPurpose.VAT_TAX_DUE]: { accountId: "td" } },
          vatMethods: { remunerationMethod: VatRemunerationMethod.RECEIVED },
          invoice: { id: "inv-1", vatRateId: "rate-1" },
          organizationId: "org-1",
        }),
      ).toThrow();
    });

    test("throws on the received method when the tax-due account is missing", () => {
      expect(() =>
        service.assertAndMapVatSystemAccounts({
          systemAccounts: { [SystemAccountPurpose.VAT_REMUNERATION_RECEIVED]: { accountId: "rr" } },
          vatMethods: { remunerationMethod: VatRemunerationMethod.RECEIVED },
          invoice: { id: "inv-1", vatRateId: "rate-1" },
          organizationId: "org-1",
        }),
      ).toThrow();
    });

    test("maps both accounts on the received method", () => {
      const result = service.assertAndMapVatSystemAccounts({
        systemAccounts: {
          [SystemAccountPurpose.VAT_REMUNERATION_RECEIVED]: { accountId: "rr" },
          [SystemAccountPurpose.VAT_TAX_DUE]: { accountId: "td" },
        },
        vatMethods: { remunerationMethod: VatRemunerationMethod.RECEIVED },
        invoice: { id: "inv-1", vatRateId: "rate-1" },
        organizationId: "org-1",
      });

      expect(result).toEqual({
        remunerationReceived: { accountId: "rr" },
        taxDue: { accountId: "td" },
      });
    });
  });

  describe("_assertAndMapInvoiceData", () => {
    test("computes the invoice total and already-paid amount from the receivable postings", () => {
      const result = service.assertAndMapInvoiceData({
        invoiceAccounts: { receivable: { accountId: "ar" } },
        invoiceId: "inv-1",
        postings: {
          invoice: [
            { accountId: "ar", debit: 1000n, credit: 0n },
            { accountId: "revenue", debit: 0n, credit: 1000n },
          ],
          payments: [
            { accountId: "ar", debit: 0n, credit: 400n },
            { accountId: "bank", debit: 400n, credit: 0n },
            { accountId: "ar", debit: 0n, credit: 100n },
          ],
        },
        vatAccounts: null,
      });

      expect(result).toEqual({
        invoiceTotal: 1000n,
        alreadyReceivedPaymentsTotal: 500n,
        vat: null,
      });
    });

    test("passes vatAccounts through unchanged when it is undefined", () => {
      const result = service.assertAndMapInvoiceData({
        invoiceAccounts: { receivable: { accountId: "ar" } },
        invoiceId: "inv-1",
        postings: {
          invoice: [{ accountId: "ar", debit: 1000n, credit: 0n }],
          payments: [],
        },
        vatAccounts: undefined,
      });

      expect(result).toEqual({
        invoiceTotal: 1000n,
        alreadyReceivedPaymentsTotal: 0n,
        vat: undefined,
      });
    });

    test("throws when the receivable posting is missing", () => {
      expect(() =>
        service.assertAndMapInvoiceData({
          invoiceAccounts: { receivable: { accountId: "ar" } },
          invoiceId: "inv-1",
          postings: {
            invoice: [{ accountId: "revenue", debit: 0n, credit: 1000n }],
            payments: [],
          },
          vatAccounts: null,
        }),
      ).toThrow();
    });

    test("computes vat due and already-received amounts when vatAccounts is present", () => {
      const vatAccounts = {
        remunerationReceived: { accountId: "rr" },
        taxDue: { accountId: "td" },
      };

      const result = service.assertAndMapInvoiceData({
        invoiceAccounts: { receivable: { accountId: "ar" } },
        invoiceId: "inv-1",
        postings: {
          invoice: [
            { accountId: "ar", debit: 1080n, credit: 0n },
            { accountId: "revenue", debit: 0n, credit: 1000n },
            { accountId: "rr", debit: 0n, credit: 80n },
          ],
          payments: [
            { accountId: "ar", debit: 0n, credit: 540n },
            { accountId: "td", debit: 0n, credit: 40n },
          ],
        },
        vatAccounts,
      });

      expect(result).toEqual({
        invoiceTotal: 1080n,
        alreadyReceivedPaymentsTotal: 540n,
        vat: { due: 80n, alreadyReceivedAmount: 40n, accounts: vatAccounts },
      });
    });

    test("throws when vatAccounts is present but the vat_remuneration_received posting is missing", () => {
      expect(() =>
        service.assertAndMapInvoiceData({
          invoiceAccounts: { receivable: { accountId: "ar" } },
          invoiceId: "inv-1",
          postings: {
            invoice: [{ accountId: "ar", debit: 1080n, credit: 0n }],
            payments: [],
          },
          vatAccounts: {
            remunerationReceived: { accountId: "rr" },
            taxDue: { accountId: "td" },
          },
        }),
      ).toThrow();
    });
  });
});
