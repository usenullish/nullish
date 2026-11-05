import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, EXCHANGE_RATE_ONE, InvoiceStatus } from "@usenullish/nullish-schema/db";
import type { Services } from "@usenullish/nullish-schema/services";
import {
  DbCollectionInvoiceSummaries,
  DbInvoiceSummaries,
} from "../../../src/billing/composites/invoice-summaries";
import { OpenInvoiceService } from "../../../src/billing/services/invoices/invoice.open";
import { PayInvoiceService } from "../../../src/billing/services/invoices/invoice.pay";
import type { InvoiceServiceArgs } from "../../../src/billing/services/invoices/_invoice";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

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

const createInvoice = async ({
  orgId,
  clientId,
  unitPrice,
}: {
  orgId: string;
  clientId: string;
  unitPrice: bigint;
}): Promise<string> => {
  const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
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

const findAmounts = async (invoiceId: string) => {
  const result = await DbInvoiceSummaries.create({ db, userId: TEST_USER_ID }).find({
    pKey: invoiceId,
  });
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw result.err;
  }
  assertNonNullish(result.result);

  return result.result;
};

describe("invoice summaries", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("finds an invoice with its amounts", async () => {
    const { orgId, clientId } = await setUpOrg();
    const invoiceId = await createInvoice({ orgId, clientId, unitPrice: 1000n });

    const { invoice, amounts } = await findAmounts(invoiceId);

    expect(invoice.id).toBe(invoiceId);
    expect(amounts.totals.total).toBe(1000n);
  });

  describe("list", () => {
    test("returns the amounts of every invoice of the page", async () => {
      const { orgId, clientId } = await setUpOrg();
      const draftId = await createInvoice({ orgId, clientId, unitPrice: 1000n });
      const openId = await createInvoice({ orgId, clientId, unitPrice: 3000n });
      await openInvoice(openId);
      await payInvoice({ invoiceId: openId, amount: 500n });

      const result = await DbCollectionInvoiceSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.result.map(({ invoice: { id } }) => id)).toEqual([draftId, openId]);
      expect(result.result.map(({ amounts }) => amounts.balance.remaining)).toEqual([1000n, 2500n]);
    });

    test("applies the invoice filters", async () => {
      const { orgId, clientId } = await setUpOrg();
      await createInvoice({ orgId, clientId, unitPrice: 1000n });
      const openId = await createInvoice({ orgId, clientId, unitPrice: 3000n });
      await openInvoice(openId);

      const result = await DbCollectionInvoiceSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters: { status: InvoiceStatus.OPEN },
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.result.map(({ invoice: { id } }) => id)).toEqual([openId]);
      expect(result.result[0]?.amounts.totals.total).toBe(3000n);
    });

    test("returns an empty list for an organization without invoices", async () => {
      const { orgId } = await setUpOrg();

      const result = await DbCollectionInvoiceSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  test("finds no summary for a missing invoice", async () => {
    const result = await DbInvoiceSummaries.create({
      db,
      userId: TEST_USER_ID,
    }).find({ pKey: TEST_MISSING_ID });

    expect(result).toEqual({ status: "success", result: undefined });
  });
});
