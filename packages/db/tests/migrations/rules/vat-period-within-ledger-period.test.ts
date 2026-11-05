import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatPeriod,
  resetDb,
  seedUsers,
  vatPeriods,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_vat_period_within_ledger_period", () => {
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

  test("rejects a VAT period when the organization has no ledger period", async () => {
    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("rejects a VAT period that starts before the ledger period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2025-12-01"),
      endOn: new Date("2026-06-30"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("rejects a VAT period that ends after a closed ledger period", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("rejects a VAT period spanning two adjacent ledger periods", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-07-01"),
      endOn: new Date("2026-12-31"),
    });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-06-01"),
      endOn: new Date("2026-07-31"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("rejects a VAT period covered only by the ledger period of another organization", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("accepts a VAT period within an open ledger period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-07-01"),
      endOn: new Date("2026-12-31"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("accepts a VAT period spanning exactly the range of a closed ledger period", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    expect(vatPeriodId).toBeDefined();
  });

  test("rejects moving a VAT period outside its ledger period", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const error = await db
      .update(vatPeriods)
      .set({ endOn: new Date("2027-06-30") })
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has no covering ledger period");
  });

  test("allows updating a VAT period that stays within its ledger period", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const [updated] = await db
      .update(vatPeriods)
      .set({ status: VatPeriodStatus.CLOSED })
      .where(eq(vatPeriods.id, vatPeriodId))
      .returning();

    expect(updated?.status).toBe(VatPeriodStatus.CLOSED);
  });
});
