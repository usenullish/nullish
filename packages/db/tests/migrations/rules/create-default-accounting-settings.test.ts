import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { accountingSettingsRow, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("seed_accounting_settings_for_organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  test("creates an accounting_settings row defaulting to CHF", async () => {
    const organizationId = await createOrganization(db);

    const settings = await accountingSettingsRow(db, organizationId);

    expect(settings.baseCurrency).toBe("CHF");
  });
});
