import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  billingSettings,
  billingSettingsRow,
  causeMessage,
  createOrganization,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_organization_immutable", () => {
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
    const settings = await billingSettingsRow(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(billingSettings)
      .set({ organizationId: otherOrganizationId })
      .where(eq(billingSettings.id, settings.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing the payment term", async () => {
    const settings = await billingSettingsRow(db, organizationId);

    const [updated] = await db
      .update(billingSettings)
      .set({ paymentTermDays: 10 })
      .where(eq(billingSettings.id, settings.id))
      .returning();

    expect(updated?.paymentTermDays).toBe(10);
  });

  test("rejects a negative payment term", async () => {
    const settings = await billingSettingsRow(db, organizationId);

    const error = await db
      .update(billingSettings)
      .set({ paymentTermDays: -1 })
      .where(eq(billingSettings.id, settings.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("billing_settings_payment_term_days_non_negative");
  });

  test("rejects a second billing_settings row for the organization", async () => {
    const error = await db
      .insert(billingSettings)
      .values({ organizationId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("billing_settings_org_uidx");
  });
});
