import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { createOrganization, createVatRate, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("vat_rates_overlap", () => {
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

  test("accepts an overlapping range for the same organization and type", async () => {
    await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const otherId = await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-06-01"),
      endOn: new Date("2026-12-31"),
    });

    expect(otherId).toBeDefined();
  });

  test("accepts an identical range for the same organization and type", async () => {
    await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const otherId = await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    expect(otherId).toBeDefined();
  });

  test("accepts an overlapping open-ended range for the same organization and type", async () => {
    await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
    });

    const otherId = await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-03-01"),
    });

    expect(otherId).toBeDefined();
  });

  test("accepts an overlapping range for a different type in the same organization", async () => {
    await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const otherId = await createVatRate(db, organizationId, {
      type: VatType.NON_CONSIDERATION,
      startOn: new Date("2026-03-01"),
      endOn: new Date("2026-09-30"),
    });

    expect(otherId).toBeDefined();
  });

  test("accepts an overlapping range for the same type in a different organization", async () => {
    const otherOrganizationId = await createOrganization(db);

    await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const otherId = await createVatRate(db, otherOrganizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    expect(otherId).toBeDefined();
  });
});
