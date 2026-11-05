import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatPeriod,
  createVatSettings,
  resetDb,
  seedUsers,
  vatMethods,
  vatPeriods,
  vatPeriodsOf,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

beforeAll(async () => {
  await resetDb(db);
  await seedUsers(db);
});

afterAll(async () => {
  await client.close();
});

describe("generate_vat_periods_for_methods", () => {
  let organizationId: string;

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createVatSettings(db, organizationId);
  });

  test("generates the semesters of the year with the net rate method", async () => {
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("generates the quarters of the year with the effective method", async () => {
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    await createVatMethods(db, organizationId, {
      periodId,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const rows = await vatPeriodsOf(db, organizationId);

    expect(rows.map(({ startOn }) => startOn)).toEqual([
      new Date("2026-01-01"),
      new Date("2026-04-01"),
      new Date("2026-07-01"),
      new Date("2026-10-01"),
    ]);
  });

  test("starts the VAT periods at the start date of the ledger period", async () => {
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-04-01") });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-04-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("caps the VAT periods at the end of a ledger period ending mid-year", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-09-30"),
    });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-09-30"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("splits a ledger period starting and ending mid-semester on the calendar semester", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-05-21"),
      endOn: new Date("2026-10-16"),
    });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-05-21"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-10-16"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("accepts a ledger period shorter than a VAT semester", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-03-31"),
    });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("keeps existing VAT periods and skips the ones overlapping them", async () => {
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-03-31"),
      status: VatPeriodStatus.CLOSED,
    });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.CLOSED,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("only generates VAT periods for the organization of the VAT methods", async () => {
    const otherOrganizationId = await createOrganization(db);
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });

    await createVatMethods(db, organizationId, { periodId });

    expect(await vatPeriodsOf(db, otherOrganizationId)).toEqual([]);
  });
});

describe("regenerate_vat_periods_for_methods", () => {
  let organizationId: string;
  let periodId: string;

  const changePaymentMethod = (paymentMethod: VatPaymentMethod) =>
    db.update(vatMethods).set({ paymentMethod }).where(eq(vatMethods.periodId, periodId));

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createVatSettings(db, organizationId);
    periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await createVatMethods(db, organizationId, { periodId });
  });

  test("replaces the semesters with quarters when the payment method changes to effective", async () => {
    await changePaymentMethod(VatPaymentMethod.EFFECTIVE);

    const rows = await vatPeriodsOf(db, organizationId);

    expect(rows.map(({ startOn, endOn }) => ({ startOn, endOn }))).toEqual([
      { startOn: new Date("2026-01-01"), endOn: new Date("2026-03-31") },
      { startOn: new Date("2026-04-01"), endOn: new Date("2026-06-30") },
      { startOn: new Date("2026-07-01"), endOn: new Date("2026-09-30") },
      { startOn: new Date("2026-10-01"), endOn: new Date("2026-12-31") },
    ]);
  });

  test("keeps the VAT periods of the other years", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-12-31"),
    });

    await changePaymentMethod(VatPaymentMethod.EFFECTIVE);

    const rows = await vatPeriodsOf(db, organizationId);

    expect(
      rows.filter(({ startOn }) => startOn >= new Date("2027-01-01")).map(({ endOn }) => endOn),
    ).toEqual([new Date("2027-06-30"), new Date("2027-12-31")]);
  });

  test("rejects the change when a VAT period of the year is closed", async () => {
    await db
      .update(vatPeriods)
      .set({ status: VatPeriodStatus.CLOSED })
      .where(
        and(
          eq(vatPeriods.organizationId, organizationId),
          eq(vatPeriods.startOn, new Date("2026-01-01")),
        ),
      );

    const error = await changePaymentMethod(VatPaymentMethod.EFFECTIVE).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });
});
