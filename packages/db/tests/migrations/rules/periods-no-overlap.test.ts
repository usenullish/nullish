import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, createPeriod, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("periods_no_overlap", () => {
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

  test("rejects a period whose range overlaps an existing one for the same organization", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const error = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-15"),
      endOn: new Date("2026-02-15"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("periods_no_overlap");
  });

  test("rejects an overlapping period even when the existing one is closed", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      status: PeriodStatus.CLOSED,
    });

    const error = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-15"),
      endOn: new Date("2026-02-15"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("periods_no_overlap");
  });

  test("accepts a period that starts the day after the previous one ends", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const secondId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-02-01"),
      endOn: new Date("2026-02-28"),
    });

    expect(secondId).toBeDefined();
  });

  test("accepts overlapping ranges across different organizations", async () => {
    const otherOrganizationId = await createOrganization(db);

    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const otherId = await createPeriod(db, otherOrganizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    expect(otherId).toBeDefined();
  });
});
