import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatSettings,
  resetDb,
  seedUsers,
  vatMethods,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_vat_methods_organization", () => {
  let organizationId: string;
  let otherOrganizationId: string;
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
    await createVatSettings(db, organizationId);
    periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    otherOrganizationId = await createOrganization(db);
    await createVatSettings(db, otherOrganizationId);
  });

  test("rejects methods with another organization than their period", async () => {
    const error = await db
      .insert(vatMethods)
      .values({
        organizationId: otherOrganizationId,
        periodId,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.NET_RATE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent ledger.periods");
  });

  test("accepts methods with the organization of their period", async () => {
    const id = await createVatMethods(db, organizationId, { periodId });

    expect(id).toBeDefined();
  });
});
