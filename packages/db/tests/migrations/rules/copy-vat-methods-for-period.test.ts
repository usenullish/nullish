import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatSettings,
  resetDb,
  seedUsers,
  vatMethods,
  vatPeriodsOf,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const vatMethodsOf = (periodId: string) =>
  db
    .select({
      remunerationMethod: vatMethods.remunerationMethod,
      paymentMethod: vatMethods.paymentMethod,
    })
    .from(vatMethods)
    .where(eq(vatMethods.periodId, periodId));

describe("copy_vat_methods_for_period", () => {
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
    await createVatSettings(db, organizationId);
  });

  test("copies the VAT methods of the previous year when the next ledger period is opened", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await createVatMethods(db, organizationId, {
      periodId,
      remunerationMethod: VatRemunerationMethod.RECEIVED,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const nextPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
    });

    expect(await vatMethodsOf(nextPeriodId)).toEqual([
      {
        remunerationMethod: VatRemunerationMethod.RECEIVED,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      },
    ]);
  });

  test("copies the VAT methods of the latest previous year", async () => {
    const firstPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2025-01-01"),
      endOn: new Date("2025-12-31"),
    });
    await createVatMethods(db, organizationId, {
      periodId: firstPeriodId,
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    const secondPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await db
      .update(vatMethods)
      .set({ paymentMethod: VatPaymentMethod.EFFECTIVE })
      .where(eq(vatMethods.periodId, secondPeriodId));

    const nextPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
    });

    expect(await vatMethodsOf(nextPeriodId)).toEqual([
      {
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      },
    ]);
  });

  test("generates the VAT periods of the next year with the copied VAT methods", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await createVatMethods(db, organizationId, { periodId });

    await createPeriod(db, organizationId, { startOn: new Date("2027-01-01") });

    const rows = await vatPeriodsOf(db, organizationId);

    expect(rows).toHaveLength(4);
    expect(rows[2]?.startOn).toEqual(new Date("2027-01-01"));
    expect(rows[3]?.endOn).toEqual(new Date("2027-12-31"));
  });

  test("copies nothing when the previous years have no VAT methods", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    const nextPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
    });

    expect(await vatMethodsOf(nextPeriodId)).toEqual([]);
    expect(await vatPeriodsOf(db, organizationId)).toEqual([]);
  });

  test("only copies the VAT methods of the organization of the ledger period", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createVatSettings(db, otherOrganizationId);
    const otherPeriodId = await createPeriod(db, otherOrganizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await createVatMethods(db, otherOrganizationId, { periodId: otherPeriodId });
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    const nextPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
    });

    expect(await vatMethodsOf(nextPeriodId)).toEqual([]);
  });
});
