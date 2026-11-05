import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
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
  vatPeriods,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_vat_period_calendar_aligned", () => {
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
    const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    await createVatMethods(db, organizationId, { periodId });
  });

  test("rejects a net rate VAT period crossing the semester boundary", async () => {
    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-05-21"),
      endOn: new Date("2027-11-20"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("must fall within a single 6-month calendar period");
  });

  test("rejects a net rate VAT period spanning a whole year", async () => {
    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-12-31"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("must fall within a single 6-month calendar period");
  });

  test("rejects a net rate VAT period shorter than six months crossing a year boundary", async () => {
    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-11-01"),
      endOn: new Date("2028-02-28"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("must fall within a single 6-month calendar period");
  });

  test("accepts a net rate VAT period spanning the first semester", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-06-30"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("accepts a net rate VAT period spanning the second semester", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-07-01"),
      endOn: new Date("2027-12-31"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("accepts a net rate VAT period shorter than a semester within it", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-05-21"),
      endOn: new Date("2027-06-30"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("accepts a one-day net rate VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-12-31"),
      endOn: new Date("2027-12-31"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("rejects moving a net rate VAT period across the semester boundary", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-06-30"),
    });

    const error = await db
      .update(vatPeriods)
      .set({ endOn: new Date("2027-07-31") })
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("must fall within a single 6-month calendar period");
  });

  test("allows updating a net rate VAT period that stays within its semester", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-06-30"),
    });

    const [updated] = await db
      .update(vatPeriods)
      .set({ status: VatPeriodStatus.CLOSED })
      .where(eq(vatPeriods.id, vatPeriodId))
      .returning();

    expect(updated?.status).toBe(VatPeriodStatus.CLOSED);
  });

  describe("effective method", () => {
    let effectiveOrganizationId: string;

    beforeEach(async () => {
      effectiveOrganizationId = await createOrganization(db);
      await createVatSettings(db, effectiveOrganizationId);
      const periodId = await createPeriod(db, effectiveOrganizationId, {
        startOn: new Date("2026-01-01"),
      });
      await createVatMethods(db, effectiveOrganizationId, {
        periodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });
    });

    test("rejects an effective VAT period crossing the quarter boundary", async () => {
      const error = await createVatPeriod(db, effectiveOrganizationId, {
        startOn: new Date("2027-03-01"),
        endOn: new Date("2027-04-30"),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("must fall within a single 3-month calendar period");
    });

    test("rejects an effective VAT period spanning a whole semester", async () => {
      const error = await createVatPeriod(db, effectiveOrganizationId, {
        startOn: new Date("2027-01-01"),
        endOn: new Date("2027-06-30"),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("must fall within a single 3-month calendar period");
    });

    test("accepts an effective VAT period spanning a quarter", async () => {
      const vatPeriodId = await createVatPeriod(db, effectiveOrganizationId, {
        startOn: new Date("2027-10-01"),
        endOn: new Date("2027-12-31"),
      });

      expect(vatPeriodId).toBeDefined();
    });

    test("accepts an effective VAT period shorter than a quarter within it", async () => {
      const vatPeriodId = await createVatPeriod(db, effectiveOrganizationId, {
        startOn: new Date("2027-05-21"),
        endOn: new Date("2027-06-30"),
      });

      expect(vatPeriodId).toBeDefined();
    });
  });

  test("checks a VAT period against the payment method of its fiscal year", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createVatSettings(db, otherOrganizationId);
    const netRatePeriodId = await createPeriod(db, otherOrganizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    const effectivePeriodId = await createPeriod(db, otherOrganizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-12-31"),
    });
    await createVatMethods(db, otherOrganizationId, { periodId: netRatePeriodId });
    await createVatMethods(db, otherOrganizationId, {
      periodId: effectivePeriodId,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const error = await createVatPeriod(db, otherOrganizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-06-30"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("must fall within a single 3-month calendar period");
  });

  test("applies no rule to a fiscal year without VAT methods", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });

    const vatPeriodId = await createVatPeriod(db, otherOrganizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-12-31"),
    });

    expect(vatPeriodId).toBeDefined();
  });
});
