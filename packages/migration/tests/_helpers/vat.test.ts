import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import {
  getVatSettingByOrgId,
  listVatMethodsByOrgId,
  listVatRatesByOrgId,
} from "../../src/_helpers/vat";
import {
  createOrganization,
  createPeriod,
  createVatRate,
  createVatSettings,
  insertVatMethods,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("vat helpers", () => {
  let orgId: string;
  let otherOrgId: string;
  let periodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      createPeriod({
        tx,
        organizationId: orgId,
        startOn: new Date(Date.UTC(2024, 0, 1)),
        endOn: new Date(Date.UTC(2024, 11, 31)),
      }),
    );

    const [period] = await db
      .select({ id: DbSchema.Ledger.Periods.PeriodsSchema.id })
      .from(DbSchema.Ledger.Periods.PeriodsSchema)
      .where(eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, orgId));
    assertNonNullish(period);
    periodId = period.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("getVatSettingByOrgId", () => {
    test("returns no VAT settings for an organization without", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getVatSettingByOrgId({ tx, organizationId: orgId }),
      );

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("returns the VAT settings of the organization", async () => {
      await createVatSettings(db, orgId);

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getVatSettingByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.organizationId).toBe(orgId);
    });
  });

  describe("listVatMethodsByOrgId", () => {
    test("returns the VAT methods of the organization", async () => {
      await insertVatMethods(db, orgId, {
        periodId,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listVatMethodsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(
        result.result.map(({ periodId, remunerationMethod, paymentMethod }) => ({
          periodId,
          remunerationMethod,
          paymentMethod,
        })),
      ).toEqual([
        {
          periodId,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
          paymentMethod: VatPaymentMethod.EFFECTIVE,
        },
      ]);
    });

    test("excludes another organization's VAT methods", async () => {
      const result = await withUser(db, TEST_OTHER_USER_ID, (tx) =>
        listVatMethodsByOrgId({ tx, organizationId: otherOrgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some(({ organizationId }) => organizationId === orgId)).toBeFalse();
    });
  });

  describe("listVatRatesByOrgId", () => {
    test("returns the VAT rates of the organization", async () => {
      const vatRateId = await createVatRate(db, orgId);

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listVatRatesByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toContain(vatRateId);
      expect(result.result.every(({ organizationId }) => organizationId === orgId)).toBeTrue();
    });

    test("returns no VAT rate of another organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listVatRatesByOrgId({ tx, organizationId: otherOrgId }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
