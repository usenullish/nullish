import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  accountingSettings,
  accountingSettingsRow,
  causeMessage,
  createClient,
  createDraftInvoice,
  createOrganization,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_accounting_settings_base_currency_immutable", () => {
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

  test("rejects changing organization_id once set", async () => {
    const settings = await accountingSettingsRow(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(accountingSettings)
      .set({ organizationId: otherOrganizationId })
      .where(eq(accountingSettings.id, settings.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing base_currency before the organization has any invoice", async () => {
    const settings = await accountingSettingsRow(db, organizationId);

    const [updated] = await db
      .update(accountingSettings)
      .set({ baseCurrency: "EUR" })
      .where(eq(accountingSettings.id, settings.id))
      .returning();

    expect(updated?.baseCurrency).toBe("EUR");
  });

  test("rejects changing base_currency once the organization has an invoice", async () => {
    const settings = await accountingSettingsRow(db, organizationId);
    const clientId = await createClient(db, organizationId);
    await createDraftInvoice(db, organizationId, clientId);

    const error = await db
      .update(accountingSettings)
      .set({ baseCurrency: "EUR" })
      .where(eq(accountingSettings.id, settings.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "base_currency cannot be changed once the organization has invoices",
    );
  });
});
