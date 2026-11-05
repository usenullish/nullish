import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatSettings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_vat_methods_settings", () => {
  let organizationId: string;
  let periodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  });

  test("rejects VAT methods for an organization without VAT settings", async () => {
    const error = await createVatMethods(db, organizationId, { periodId }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "VAT methods require the VAT settings of the organization",
    );
  });

  test("accepts VAT methods for an organization with VAT settings", async () => {
    await createVatSettings(db, organizationId);

    const id = await createVatMethods(db, organizationId, { periodId });

    expect(id).toBeDefined();
  });
});
