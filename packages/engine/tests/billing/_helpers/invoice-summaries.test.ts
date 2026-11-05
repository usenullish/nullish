import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  EXCHANGE_RATE_ONE,
  InvoiceLineType,
  InvoiceStatus,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import type { Services } from "@usenullish/nullish-schema/services";
import { loadInvoiceSummaries } from "../../../src/billing/_helpers/invoice-summaries";
import { getInvoice } from "../../../src/billing/_helpers/invoices";
import { OpenInvoiceService } from "../../../src/billing/services/invoices/invoice.open";
import { PayInvoiceService } from "../../../src/billing/services/invoices/invoice.pay";
import { VoidInvoiceService } from "../../../src/billing/services/invoices/invoice.void";
import { UncollectibleInvoiceService } from "../../../src/billing/services/invoices/invoice.uncollectible";
import type { InvoiceServiceArgs } from "../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  createVatSettings,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const serviceArgs = (invoiceId: string): InvoiceServiceArgs => ({
  db: db as unknown as InvoiceServiceArgs["db"],
  userId: TEST_USER_ID,
  invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
});

const makePayment = (amount: bigint): Services["Invoices"]["Pay"]["Args"] => ({
  amount,
  currency: "CHF",
  exchangeRate: EXCHANGE_RATE_ONE,
  validOn: new Date("2026-03-01"),
});

const setUpOrg = async (): Promise<{ orgId: string; clientId: string }> => {
  const orgId = await createOrganization(db, TEST_USER_ID);
  await db.insert(periods).values({
    organizationId: orgId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });
  const clientId = await createClient(db, orgId);

  return { orgId, clientId };
};

const seedVatRate = async (organizationId: string): Promise<string> => {
  await createVatSettings(db, {
    organizationId,
    remunerationMethod: VatRemunerationMethod.AGREED,
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

const createInvoice = async ({
  orgId,
  clientId,
  unitPrice,
  vatRateId,
}: {
  orgId: string;
  clientId: string;
  unitPrice: bigint;
  vatRateId?: string;
}): Promise<string> => {
  const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId, vatRateId });
  await createLine(db, invoiceId, "Item", { unitPrice });

  return invoiceId;
};

const openInvoice = async (invoiceId: string): Promise<void> => {
  const result = await OpenInvoiceService.create(serviceArgs(invoiceId)).open();
  expect(result.status).toBe("success");
};

const payInvoice = async ({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: bigint;
}): Promise<void> => {
  const result = await PayInvoiceService.create(serviceArgs(invoiceId)).pay(makePayment(amount));
  expect(result.status).toBe("success");
};

const summarize = async (invoiceIds: [string, ...string[]]) =>
  await db.transaction(async (tx) => {
    const [firstId, ...restIds] = invoiceIds;

    const first = await getInvoice({ tx, id: firstId });
    const rest = await Promise.all(restIds.map((id) => getInvoice({ tx, id })));

    return await loadInvoiceSummaries({
      tx,
      organizationId: first.organizationId,
      invoices: [first, ...rest],
    });
  });

const findAmounts = async (invoiceId: string) => {
  const [summary] = await summarize([invoiceId]);
  assertNonNullish(summary);

  return summary;
};

describe("loadInvoiceSummaries", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("draft", () => {
    test("totals the lines of a draft without VAT", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 1000n });

      const { invoice, amounts } = await findAmounts(invoiceId);

      expect(invoice.id).toBe(invoiceId);
      expect(amounts).toEqual({
        totals: { subtotal: 1000n, vat: 0n, total: 1000n },
        balance: { paid: 0n, remaining: 1000n },
      });
    });

    test("adds the VAT billed to the client at the rate of the invoice", async () => {
      const { orgId, clientId } = await setUpOrg();
      const vatRateId = await seedVatRate(orgId);
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 20500n, vatRateId });

      const { amounts } = await findAmounts(invoiceId);

      expect(amounts.totals.subtotal).toBe(20500n);
      expect(amounts.totals.vat).toBe(1661n);
      expect(amounts.totals.total).toBe(22161n);
      expect(amounts.balance.remaining).toBe(22161n);
    });

    test("returns negative amounts when the discounts exceed the items", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 500n });
      await createLine(db, invoiceId, "Discount", {
        type: InvoiceLineType.DISCOUNT,
        unitPrice: 1000n,
      });

      const { amounts } = await findAmounts(invoiceId);

      expect(amounts.totals.subtotal).toBe(-500n);
      expect(amounts.totals.total).toBe(-500n);
    });

    test("returns zero amounts for a draft without lines", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });

      const { amounts } = await findAmounts(invoiceId);

      expect(amounts.totals.total).toBe(0n);
      expect(amounts.balance.remaining).toBe(0n);
    });
  });

  describe("booked", () => {
    test("matches the amount charged to accounts receivable when opened with VAT", async () => {
      const { orgId, clientId } = await setUpOrg();
      const vatRateId = await seedVatRate(orgId);
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 20500n, vatRateId });

      const draft = await findAmounts(invoiceId);
      await openInvoice(invoiceId);
      const { invoice, amounts } = await findAmounts(invoiceId);

      expect(invoice.status).toBe(InvoiceStatus.OPEN);
      expect(amounts).toEqual(draft.amounts);
    });

    test("deducts a partial payment from the remaining amount", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 5000n });
      await openInvoice(invoiceId);
      await payInvoice({ invoiceId, amount: 1000n });

      const { amounts } = await findAmounts(invoiceId);

      expect(amounts.totals.total).toBe(5000n);
      expect(amounts.balance.paid).toBe(1000n);
      expect(amounts.balance.remaining).toBe(4000n);
    });

    test("has nothing remaining once fully paid", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 1000n });
      await openInvoice(invoiceId);
      await payInvoice({ invoiceId, amount: 1000n });

      const { invoice, amounts } = await findAmounts(invoiceId);

      expect(invoice.status).toBe(InvoiceStatus.PAID);
      expect(amounts.balance.paid).toBe(1000n);
      expect(amounts.balance.remaining).toBe(0n);
    });

    test("keeps the total and the payments of a written off invoice with nothing remaining", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 1000n });
      await openInvoice(invoiceId);
      await payInvoice({ invoiceId, amount: 100n });

      const writeOff = await UncollectibleInvoiceService.create(serviceArgs(invoiceId)).writeOff({
        validOn: new Date("2026-03-01"),
      });
      expect(writeOff.status).toBe("success");

      const { invoice, amounts } = await findAmounts(invoiceId);

      expect(invoice.status).toBe(InvoiceStatus.UNCOLLECTIBLE);
      expect(amounts.totals.total).toBe(1000n);
      expect(amounts.balance.paid).toBe(100n);
      expect(amounts.balance.remaining).toBe(0n);
    });

    test("has nothing remaining once voided", async () => {
      const { orgId, clientId } = await setUpOrg();
      const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 1000n });
      await openInvoice(invoiceId);

      const voided = await VoidInvoiceService.create(serviceArgs(invoiceId)).void({
        validOn: new Date("2026-03-01"),
      });
      expect(voided.status).toBe("success");

      const { invoice, amounts } = await findAmounts(invoiceId);

      expect(invoice.status).toBe(InvoiceStatus.VOID);
      expect(amounts.totals.total).toBe(1000n);
      expect(amounts.balance.remaining).toBe(0n);
    });
  });

  test("summarizes several invoices at once in their order", async () => {
    const { orgId, clientId } = await setUpOrg();
    const firstId = await createInvoice({ orgId, clientId, unitPrice: 1000n });
    const secondId = await createInvoice({ orgId, clientId, unitPrice: 2000n });

    const summaries = await summarize([secondId, firstId]);

    expect(summaries.map(({ invoice: { id } }) => id)).toEqual([secondId, firstId]);
    expect(summaries.map(({ amounts }) => amounts.totals.total)).toEqual([2000n, 1000n]);
  });
});
