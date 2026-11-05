import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { billingSettingsRow, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("seed_billing_settings_for_organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  test("creates a billing_settings row defaulting to a payment term of 30 days", async () => {
    const organizationId = await createOrganization(db);

    const settings = await billingSettingsRow(db, organizationId);

    expect(settings.paymentTermDays).toBe(30);
  });
});
