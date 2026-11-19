import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { SubscriptionTaxRatesService } from "../../src/subscription/services/subscription-tax-rates";
import { openTestDb } from "../_test-utils";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = SubscriptionTaxRatesService.create({ db });

describe("SubscriptionTaxRatesService", () => {
  const provider = SubscriptionProvider.STRIPE;

  beforeEach(async () => {
    await db.delete(taxRates);
  });

  afterAll(async () => {
    await db.delete(taxRates);
    await instance.close();
  });

  test("inserts a tax rate with its provider, id and start", async () => {
    const startOn = new Date("2026-01-01");

    const result = await service.insert({
      taxRate: { provider, externalTaxRateId: "txr_2026", startOn },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.provider).toBe(provider);
    expect(result.result.externalTaxRateId).toBe("txr_2026");
    expect(result.result.startOn.getTime()).toBe(startOn.getTime());
    expect(result.result.endOn).toBeNull();
  });

  test("lists the tax rates by start", async () => {
    await service.insert({
      taxRate: {
        provider,
        externalTaxRateId: "txr_2025",
        startOn: new Date("2025-01-01"),
        endOn: new Date("2025-12-31"),
      },
    });
    await service.insert({
      taxRate: { provider, externalTaxRateId: "txr_2026", startOn: new Date("2026-01-01") },
    });

    const result = await service.list();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.map(({ externalTaxRateId }) => externalTaxRateId)).toEqual([
      "txr_2025",
      "txr_2026",
    ]);
  });

  test("sets the end date of a tax rate", async () => {
    const inserted = await service.insert({
      taxRate: { provider, externalTaxRateId: "txr_2026", startOn: new Date("2026-01-01") },
    });

    if (inserted.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const endOn = new Date("2026-12-31");

    const result = await service.update({ taxRateId: inserted.result.id, taxRate: { endOn } });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result?.endOn?.getTime()).toBe(endOn.getTime());
  });

  test("rejects a tax rate that overlaps the current one", async () => {
    await service.insert({
      taxRate: { provider, externalTaxRateId: "txr_2026", startOn: new Date("2026-01-01") },
    });

    const result = await service.insert({
      taxRate: { provider, externalTaxRateId: "txr_2027", startOn: new Date("2027-01-01") },
    });

    expect(result.status).toBe("error");
  });
});
