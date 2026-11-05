import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatPeriod,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("vat_periods_no_overlap", () => {
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

  test("rejects a period whose range overlaps an existing one for the same organization", async () => {
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-06-01"),
      endOn: new Date("2026-12-31"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("vat_periods_no_overlap");
  });

  test("rejects a period contained in an existing one", async () => {
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-02-01"),
      endOn: new Date("2026-02-28"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("vat_periods_no_overlap");
  });

  test("rejects a period that starts on the day the previous one ends", async () => {
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const error = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-06-30"),
      endOn: new Date("2026-12-31"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("vat_periods_no_overlap");
  });

  test("accepts a period that starts the day after the previous one ends", async () => {
    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const secondId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-07-01"),
      endOn: new Date("2026-12-31"),
    });

    expect(secondId).toBeDefined();
  });

  test("accepts overlapping ranges across different organizations", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });

    await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const otherId = await createVatPeriod(db, otherOrganizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    expect(otherId).toBeDefined();
  });
});
