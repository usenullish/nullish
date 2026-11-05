import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { VatPaymentMethod } from "@usenullish/nullish-schema/db";
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

describe("vat_methods_period_uidx", () => {
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
    await createVatSettings(db, organizationId);
    periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
  });

  test("rejects a second methods row for the same period", async () => {
    await createVatMethods(db, organizationId, { periodId });

    const error = await createVatMethods(db, organizationId, {
      periodId,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("vat_methods_period_uidx");
  });

  test("accepts different methods for consecutive periods", async () => {
    const nextPeriodId = await createPeriod(db, organizationId, {
      startOn: new Date("2027-01-01"),
      endOn: new Date("2027-12-31"),
    });

    await createVatMethods(db, organizationId, { periodId });

    const id = await createVatMethods(db, organizationId, {
      periodId: nextPeriodId,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    expect(id).toBeDefined();
  });
});
