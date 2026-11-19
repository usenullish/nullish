import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { getSubscriptionTaxRate } from "../../../src/services/_helpers/subscription-tax-rates";
import { openTestDb } from "../../../../admin/tests/_test-utils";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("getSubscriptionTaxRate", () => {
  const provider = SubscriptionProvider.STRIPE;

  const taxRateValidOn = ({ validOn }: { validOn: Date }) =>
    db.transaction((tx) => getSubscriptionTaxRate({ tx, provider, validOn }));

  beforeAll(async () => {
    await db.delete(taxRates);
    await db.insert(taxRates).values([
      {
        provider,
        externalTaxRateId: "txr_2025",
        startOn: new Date("2025-01-01"),
        endOn: new Date("2025-12-31"),
      },
      {
        provider,
        externalTaxRateId: "txr_2026",
        startOn: new Date("2026-01-01"),
        endOn: null,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(taxRates);
    await instance.close();
  });

  test("returns the rate whose period contains the date", async () => {
    const taxRate = await taxRateValidOn({ validOn: new Date("2025-06-15") });

    expect(taxRate?.externalTaxRateId).toBe("txr_2025");
  });

  test("includes the first and the last day of the period", async () => {
    const first = await taxRateValidOn({ validOn: new Date("2025-01-01") });
    const last = await taxRateValidOn({ validOn: new Date("2025-12-31") });

    expect(first?.externalTaxRateId).toBe("txr_2025");
    expect(last?.externalTaxRateId).toBe("txr_2025");
  });

  test("returns the rate without end after its start", async () => {
    const taxRate = await taxRateValidOn({ validOn: new Date("2030-01-01") });

    expect(taxRate?.externalTaxRateId).toBe("txr_2026");
  });

  test("returns nothing before the first rate", async () => {
    expect(await taxRateValidOn({ validOn: new Date("2024-12-31") })).toBeUndefined();
  });
});
