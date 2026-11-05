import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatRate,
  createVatSettings,
  resetDb,
  seedUsers,
  vatMethods,
  vatRates,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const ratesOf = (organizationId: string) =>
  db
    .select({
      code: vatRates.code,
      type: vatRates.type,
      rate: vatRates.rate,
      netRate: vatRates.netRate,
      startOn: vatRates.startOn,
      endOn: vatRates.endOn,
    })
    .from(vatRates)
    .where(eq(vatRates.organizationId, organizationId))
    .orderBy(vatRates.code);

const createMethods = async ({
  organizationId,
  paymentMethod,
}: {
  organizationId: string;
  paymentMethod?: VatPaymentMethod;
}): Promise<void> => {
  await createVatSettings(db, organizationId);
  const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  await createVatMethods(db, organizationId, { periodId, paymentMethod });
};

describe("seed_common_vat_rates and seed_payment_method_vat_rates", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("leaves a new organization without VAT rates", async () => {
    expect(await ratesOf(organizationId)).toEqual([]);
  });

  test("seeds the rates common to every organization when the VAT methods are created", async () => {
    await createMethods({ organizationId });

    const startOn = new Date("2024-01-01");

    expect(await ratesOf(organizationId)).toEqual([
      {
        code: "BZB81",
        type: VatType.ACQUISITION_TAX_INVESTMENTS,
        rate: 8.1,
        netRate: null,
        startOn,
        endOn: null,
      },
      {
        code: "BZM81",
        type: VatType.ACQUISITION_TAX_MATERIALS,
        rate: 8.1,
        netRate: null,
        startOn,
        endOn: null,
      },
      {
        code: "CEX",
        type: VatType.NON_TAXABLE_TURNOVER,
        rate: 0,
        netRate: null,
        startOn,
        endOn: null,
      },
      {
        code: "SPE",
        type: VatType.NON_CONSIDERATION,
        rate: 0,
        netRate: null,
        startOn,
        endOn: null,
      },
    ]);
  });

  test("seeds the common rates plus the sales and input tax rates for the effective method", async () => {
    await createMethods({ organizationId, paymentMethod: VatPaymentMethod.EFFECTIVE });

    const rates = await ratesOf(organizationId);

    expect(rates.map(({ code, type, rate }) => ({ code, type, rate }))).toEqual([
      { code: "BZB81", type: VatType.ACQUISITION_TAX_INVESTMENTS, rate: 8.1 },
      { code: "BZM81", type: VatType.ACQUISITION_TAX_MATERIALS, rate: 8.1 },
      { code: "CEX", type: VatType.NON_TAXABLE_TURNOVER, rate: 0 },
      { code: "DOUACE", type: VatType.IMPORT_TAX_INVESTMENTS, rate: 100 },
      { code: "DOUAM", type: VatType.IMPORT_TAX_MATERIALS, rate: 100 },
      { code: "SPE", type: VatType.NON_CONSIDERATION, rate: 0 },
      { code: "UN81", type: VatType.SALES_TAX_DUE, rate: 8.1 },
      { code: "UR26", type: VatType.SALES_TAX_DUE, rate: 2.6 },
      { code: "US38", type: VatType.SALES_TAX_DUE, rate: 3.8 },
      { code: "VB26", type: VatType.INPUT_TAX_INVESTMENTS, rate: 2.6 },
      { code: "VB38", type: VatType.INPUT_TAX_INVESTMENTS, rate: 3.8 },
      { code: "VB81", type: VatType.INPUT_TAX_INVESTMENTS, rate: 8.1 },
      { code: "VM26", type: VatType.INPUT_TAX_MATERIALS, rate: 2.6 },
      { code: "VM38", type: VatType.INPUT_TAX_MATERIALS, rate: 3.8 },
      { code: "VM81", type: VatType.INPUT_TAX_MATERIALS, rate: 8.1 },
    ]);
  });

  test("does not seed the sales, input and import tax rates for the net rate method", async () => {
    await createMethods({ organizationId });

    const rates = await ratesOf(organizationId);

    expect(
      rates.some(({ type }) =>
        [
          VatType.SALES_TAX_DUE,
          VatType.INPUT_TAX_MATERIALS,
          VatType.INPUT_TAX_INVESTMENTS,
          VatType.IMPORT_TAX_MATERIALS,
          VatType.IMPORT_TAX_INVESTMENTS,
        ].includes(type),
      ),
    ).toBeFalse();
  });

  test("does not seed the net rate tax", async () => {
    await createMethods({ organizationId });

    const rates = await ratesOf(organizationId);

    expect(rates.some(({ type }) => type === VatType.NET_RATE_TAX)).toBeFalse();
  });

  test("does not seed the common rates of an organization which already has a VAT rate", async () => {
    await createVatRate(db, organizationId, { code: "OWN" });

    await createMethods({ organizationId });

    expect((await ratesOf(organizationId)).map(({ code }) => code)).toEqual(["OWN"]);
  });

  describe("when a later year uses another payment method", () => {
    const EFFECTIVE_CODES = ["UN81", "VM81", "VB81", "DOUAM"];

    let firstPeriodId: string;
    let secondPeriodId: string;

    const codesOf = async (): Promise<string[]> =>
      (await ratesOf(organizationId)).map(({ code }) => code);

    const changePaymentMethod = ({
      periodId,
      paymentMethod,
    }: {
      periodId: string;
      paymentMethod: VatPaymentMethod;
    }) =>
      db
        .update(vatMethods)
        .set({ paymentMethod })
        .where(
          and(eq(vatMethods.organizationId, organizationId), eq(vatMethods.periodId, periodId)),
        );

    beforeEach(async () => {
      await createVatSettings(db, organizationId);
      firstPeriodId = await createPeriod(db, organizationId, {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });
      await createVatMethods(db, organizationId, { periodId: firstPeriodId });
      secondPeriodId = await createPeriod(db, organizationId, {
        startOn: new Date("2027-01-01"),
        endOn: new Date("2027-12-31"),
      });
    });

    test("seeds the rates of the effective method when the year switches to it", async () => {
      await changePaymentMethod({
        periodId: secondPeriodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      expect(await codesOf()).toEqual(expect.arrayContaining(EFFECTIVE_CODES));
    });

    test("keeps the rates of the previous method when switching", async () => {
      const before = await codesOf();

      await changePaymentMethod({
        periodId: secondPeriodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      expect(await codesOf()).toEqual(expect.arrayContaining(before));
    });

    test("seeds nothing when a new year keeps the method of the previous one", async () => {
      await changePaymentMethod({
        periodId: secondPeriodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });
      await db
        .delete(vatRates)
        .where(and(eq(vatRates.organizationId, organizationId), eq(vatRates.code, "VM81")));

      await createPeriod(db, organizationId, {
        startOn: new Date("2028-01-01"),
        endOn: new Date("2028-12-31"),
      });

      expect(await codesOf()).not.toContain("VM81");
    });

    test("does not seed the rates of a method another year already uses", async () => {
      await changePaymentMethod({
        periodId: secondPeriodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });
      const before = await codesOf();

      await changePaymentMethod({
        periodId: firstPeriodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      expect(await codesOf()).toEqual(before);
    });
  });

  test("seeds each organization separately", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createMethods({ organizationId });

    expect(await ratesOf(otherOrganizationId)).toEqual([]);
  });
});
