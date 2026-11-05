import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { getAccountingSetting } from "../../../src/core/_helpers/accounting-settings";
import { envDbUrl } from "@usenullish/nullish-env";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const accountingSettings = DbSchema.Core.Accounting.AccountingSettingsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("getAccountingSetting", () => {
  let orgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns the organization's single seeded settings row", async () => {
    const setting = await db.transaction((tx) =>
      getAccountingSetting({ tx, organizationId: orgId }),
    );

    expect(setting.organizationId).toBe(orgId);
    expect(setting.baseCurrency).toBe("CHF");
  });

  test("rejects when the organization has no settings row", async () => {
    await db.delete(accountingSettings).where(eq(accountingSettings.organizationId, orgId));

    await expect(
      db.transaction((tx) => getAccountingSetting({ tx, organizationId: orgId })),
    ).rejects.toThrow();
  });
});
