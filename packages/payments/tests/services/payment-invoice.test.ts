import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { PaymentInvoiceService } from "../../src/services/payment-invoice";
import { openTestDb } from "../../../admin/tests/_test-utils";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("PaymentInvoiceService", () => {
  const provider = SubscriptionProvider.STRIPE;

  const prepare = ({ validOn }: { validOn: Date }) =>
    PaymentInvoiceService.create({ db }).prepare({ provider, validOn });

  beforeAll(async () => {
    await db.delete(taxRates);
    await db.insert(taxRates).values([
      {
        provider,
        externalTaxRateId: "txr_2026",
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      },
      {
        provider,
        externalTaxRateId: "txr_2027",
        startOn: new Date("2027-01-01"),
        endOn: null,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(taxRates);
    await instance.close();
  });

  test("returns the tax rate valid on the date of the invoice", async () => {
    expect(await prepare({ validOn: new Date("2027-01-01") })).toEqual({
      status: "success",
      result: { externalTaxRateId: "txr_2027" },
    });
  });

  test("fails when no tax rate is valid on the date", async () => {
    const result = await prepare({ validOn: new Date("2025-06-15") });

    expect(result.status).toBe("error");
  });
});
