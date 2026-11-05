import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
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

describe("check_organization_immutable on core.vat_periods", () => {
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

  test("rejects changing organization_id of an open VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-03-31"),
    });
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });

    const error = await db
      .update(vatPeriods)
      .set({ organizationId: otherOrganizationId })
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });
});
