import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  VatPaymentMethod,
  VatPeriodStatus,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import {
  GetVatRateError,
  GetVatMethodsError,
  getVatData,
  getVatPeriod,
  getVatRate,
  getVatRateById,
  getVatMethods,
  listOpenVatPeriods,
} from "../../../src/core/_helpers/vat";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  createVatSettings,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const vatPeriods = DbSchema.Core.Vat.VatPeriodsSchema;
const ledgerPeriods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const VALID_ON = new Date("2026-06-15");

describe("core/_helpers/vat", () => {
  let orgId: string;
  let otherOrgId: string;

  const seedVatSettings = (): Promise<void> =>
    createVatSettings(db, {
      organizationId: orgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });

  const seedVatRate = async (organizationId: string = orgId): Promise<string> => {
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

  const seedVatPeriod = async (organizationId: string): Promise<string> => {
    const [row] = await db
      .insert(vatPeriods)
      .values({
        organizationId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_USER_ID);

    await db.insert(ledgerPeriods).values([
      { organizationId: orgId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") },
      {
        organizationId: otherOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      },
    ]);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE core.vat_settings, core.vat_methods, core.vat_rates, core.vat_periods CASCADE;`,
    );
  });

  describe("getVatMethods", () => {
    test("returns undefined when the organization has no VAT methods", async () => {
      const result = await db.transaction((tx) =>
        getVatMethods({ tx, organizationId: orgId, validOn: VALID_ON }),
      );

      expect(result).toBeUndefined();
    });

    test("returns the methods of the fiscal year containing the date", async () => {
      await seedVatSettings();

      const result = await db.transaction((tx) =>
        getVatMethods({ tx, organizationId: orgId, validOn: VALID_ON }),
      );

      expect(result?.organizationId).toBe(orgId);
      expect(result?.paymentMethod).toBe(VatPaymentMethod.NET_RATE);
    });

    test("returns undefined on a date outside the fiscal years of the organization", async () => {
      await seedVatSettings();

      const result = await db.transaction((tx) =>
        getVatMethods({ tx, organizationId: orgId, validOn: new Date("2027-03-01") }),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("getVatPeriod", () => {
    test("returns the VAT period of the organization", async () => {
      const vatPeriodId = await seedVatPeriod(orgId);

      const result = await db.transaction((tx) =>
        getVatPeriod({ tx, id: vatPeriodId, organizationId: orgId }),
      );

      expect(result.id).toBe(vatPeriodId);
      expect(result.organizationId).toBe(orgId);
      expect(result.startOn).toEqual(new Date("2026-01-01"));
      expect(result.endOn).toEqual(new Date("2026-06-30"));
    });

    test("throws GetVatRateError when no VAT period matches the id", async () => {
      await expect(
        db.transaction((tx) => getVatPeriod({ tx, id: TEST_MISSING_ID, organizationId: orgId })),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });

    test("throws GetVatRateError for a VAT period of another organization", async () => {
      const otherVatPeriodId = await seedVatPeriod(otherOrgId);

      await expect(
        db.transaction((tx) => getVatPeriod({ tx, id: otherVatPeriodId, organizationId: orgId })),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });
  });

  describe("listOpenVatPeriods", () => {
    const RANGE = { startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") };

    test("returns the open VAT periods overlapping the dates", async () => {
      const vatPeriodId = await seedVatPeriod(orgId);

      const result = await db.transaction((tx) =>
        listOpenVatPeriods({ tx, organizationId: orgId, ...RANGE }),
      );

      expect(result.map(({ id }) => id)).toEqual([vatPeriodId]);
    });

    test("returns a VAT period that only partly overlaps the dates", async () => {
      const vatPeriodId = await seedVatPeriod(orgId);

      const result = await db.transaction((tx) =>
        listOpenVatPeriods({
          tx,
          organizationId: orgId,
          startOn: new Date("2026-06-30"),
          endOn: new Date("2026-12-31"),
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([vatPeriodId]);
    });

    test("ignores the closed VAT periods", async () => {
      await db.insert(vatPeriods).values({
        organizationId: orgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.CLOSED,
      });

      const result = await db.transaction((tx) =>
        listOpenVatPeriods({ tx, organizationId: orgId, ...RANGE }),
      );

      expect(result).toEqual([]);
    });

    test("ignores the VAT periods outside the dates", async () => {
      await seedVatPeriod(orgId);

      const result = await db.transaction((tx) =>
        listOpenVatPeriods({
          tx,
          organizationId: orgId,
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
        }),
      );

      expect(result).toEqual([]);
    });

    test("ignores the VAT periods of another organization", async () => {
      await seedVatPeriod(otherOrgId);

      const result = await db.transaction((tx) =>
        listOpenVatPeriods({ tx, organizationId: orgId, ...RANGE }),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getVatRate", () => {
    test("returns the applicable net-rate-tax rate for the date", async () => {
      await seedVatRate();

      const result = await db.transaction((tx) =>
        getVatRate({ tx, organizationId: orgId, validOn: VALID_ON }),
      );

      expect(result.organizationId).toBe(orgId);
      expect(result.type).toBe(VatType.NET_RATE_TAX);
    });

    test("throws GetVatRateError when no rate applies to the date", async () => {
      await seedVatRate();

      await expect(
        db.transaction((tx) =>
          getVatRate({ tx, organizationId: orgId, validOn: new Date("2025-01-01") }),
        ),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });

    test("throws GetVatRateError when the organization has no rate", async () => {
      await expect(
        db.transaction((tx) => getVatRate({ tx, organizationId: orgId, validOn: VALID_ON })),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });
  });

  describe("getVatRateById", () => {
    test("returns the rate of the organization valid on the date", async () => {
      const vatRateId = await seedVatRate();

      const result = await db.transaction((tx) =>
        getVatRateById({ tx, id: vatRateId, organizationId: orgId, validOn: VALID_ON }),
      );

      expect(result.id).toBe(vatRateId);
      expect(result.organizationId).toBe(orgId);
    });

    test("throws GetVatRateError when the rate is not valid on the date", async () => {
      const vatRateId = await seedVatRate();

      await expect(
        db.transaction((tx) =>
          getVatRateById({
            tx,
            id: vatRateId,
            organizationId: orgId,
            validOn: new Date("2025-01-01"),
          }),
        ),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });

    test("throws GetVatRateError for a rate of another organization", async () => {
      const otherVatRateId = await seedVatRate(otherOrgId);

      await expect(
        db.transaction((tx) =>
          getVatRateById({ tx, id: otherVatRateId, organizationId: orgId, validOn: VALID_ON }),
        ),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });

    test("throws GetVatRateError when no rate matches the id", async () => {
      await expect(
        db.transaction((tx) =>
          getVatRateById({ tx, id: TEST_MISSING_ID, organizationId: orgId, validOn: VALID_ON }),
        ),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });
  });

  describe("getVatData", () => {
    test("returns the methods and the given rate", async () => {
      await seedVatSettings();
      const vatRateId = await seedVatRate();

      const result = await db.transaction((tx) =>
        getVatData({ tx, organizationId: orgId, vatRateId, validOn: VALID_ON }),
      );

      expect(result?.methods.organizationId).toBe(orgId);
      expect(result?.rate.id).toBe(vatRateId);
    });

    test("throws GetVatMethodsError when a rate is given but the organization has no VAT methods on the date", async () => {
      const vatRateId = await seedVatRate();

      await expect(
        db.transaction((tx) =>
          getVatData({ tx, organizationId: orgId, vatRateId, validOn: VALID_ON }),
        ),
      ).rejects.toBeInstanceOf(GetVatMethodsError);
    });

    test("throws GetVatRateError when the given rate is not valid on the date", async () => {
      await seedVatSettings();
      const [row] = await db
        .insert(vatRates)
        .values({
          organizationId: orgId,
          code: "UN81",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2026-07-01"),
        })
        .returning();
      assertNonNullish(row);

      await expect(
        db.transaction((tx) =>
          getVatData({ tx, organizationId: orgId, vatRateId: row.id, validOn: VALID_ON }),
        ),
      ).rejects.toBeInstanceOf(GetVatRateError);
    });
  });
});
