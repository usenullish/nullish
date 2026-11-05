import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { insertOrganization, periods, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("seed_period_for_organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  test("opens a period covering the current calendar year", async () => {
    const organizationId = await insertOrganization(db);

    const rows = await db.select().from(periods).where(eq(periods.organizationId, organizationId));

    const year = new Date().getUTCFullYear();

    expect(rows.map(({ startOn, endOn, status }) => ({ startOn, endOn, status }))).toEqual([
      {
        startOn: new Date(`${year}-01-01`),
        endOn: new Date(`${year}-12-31`),
        status: PeriodStatus.OPEN,
      },
    ]);
  });
});
