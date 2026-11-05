import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  createPeriod,
  createVatPeriod,
  generateVatPeriods,
  resetDb,
  seedUsers,
  vatPeriodsOf,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("generate_vat_periods", () => {
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
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  });

  test("splits a calendar year into two open semesters for the net rate method", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01");

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

  test("ends the first period at the end of its calendar semester for a mid-year start", async () => {
    await generateVatPeriods(db, organizationId, "2026-04-01");

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

  test("aligns to calendar semesters when both the start and the end are mid-semester", async () => {
    await generateVatPeriods(db, organizationId, "2026-05-21", { endOn: "2026-10-16" });

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

  test("creates a single period ending at year end when the start is in the second semester", async () => {
    await generateVatPeriods(db, organizationId, "2026-09-15");

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-09-15"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("creates a one-day period when the start is the last day of the year", async () => {
    await generateVatPeriods(db, organizationId, "2026-12-31");

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-12-31"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("caps the last period at the given end date", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01", { endOn: "2026-09-30" });

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

  test("creates a single period ending at the given end date when it falls within the first semester", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01", { endOn: "2026-03-31" });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("still stops at the end of the year when the given end date is in a later year", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01", { endOn: "2027-06-30" });

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

  test("does not create periods in the following year", async () => {
    await generateVatPeriods(db, organizationId, "2026-07-01");

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("is idempotent when called twice with the same arguments", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01");
    await generateVatPeriods(db, organizationId, "2026-01-01");

    expect(await vatPeriodsOf(db, organizationId)).toHaveLength(2);
  });

  test("skips a period overlapping an existing one and still creates the others", async () => {
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-03-31"),
    });

    await generateVatPeriods(db, organizationId, "2026-01-01");

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("splits a calendar year into four open quarters for the effective method", async () => {
    await generateVatPeriods(db, organizationId, "2026-01-01", {
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-03-31"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-04-01"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-09-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-10-01"),
        endOn: new Date("2026-12-31"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("aligns to calendar quarters for the effective method when the start and the end are mid-quarter", async () => {
    await generateVatPeriods(db, organizationId, "2026-05-21", {
      endOn: "2026-10-16",
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    expect(await vatPeriodsOf(db, organizationId)).toEqual([
      {
        startOn: new Date("2026-05-21"),
        endOn: new Date("2026-06-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-09-30"),
        status: VatPeriodStatus.OPEN,
      },
      {
        startOn: new Date("2026-10-01"),
        endOn: new Date("2026-10-16"),
        status: VatPeriodStatus.OPEN,
      },
    ]);
  });

  test("only creates periods for the given organization", async () => {
    const otherOrganizationId = await createOrganization(db);

    await generateVatPeriods(db, organizationId, "2026-01-01");

    expect(await vatPeriodsOf(db, otherOrganizationId)).toEqual([]);
  });
});
