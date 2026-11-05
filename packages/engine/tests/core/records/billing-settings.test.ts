import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, VatType } from "@usenullish/nullish-schema/db";
import {
  DbBillingSettings,
  DbCollectionBillingSettings,
} from "../../../src/core/records/billing-settings";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const billingSettings = DbSchema.Core.Billing.BillingSettingsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const settingsIdFor = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(billingSettings)
    .where(eq(billingSettings.organizationId, organizationId));
  assertNonNullish(row);
  return row.id;
};

describe("billing-settings", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbBillingSettings;
  let collectionStore: DbCollectionBillingSettings;
  let settingsId: string;
  let siblingSettingsId: string;
  let otherSettingsId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbBillingSettings.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionBillingSettings.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    settingsId = await settingsIdFor(orgId);
    siblingSettingsId = await settingsIdFor(siblingOrgId);
    otherSettingsId = await settingsIdFor(otherOrgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the settings row of the caller's organization", async () => {
      const result = await store.find({ pKey: settingsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(settingsId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns the settings row of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingSettingsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingSettingsId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for the settings row of another organization", async () => {
      const result = await store.find({ pKey: otherSettingsId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the payment term and bumps the version", async () => {
      const result = await store.update({
        pKey: settingsId,
        values: { version: 1, paymentTermDays: 10 },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.paymentTermDays).toBe(10);
      expect(result.result.version).toBe(2);
    });

    test("sets then clears the default VAT rate", async () => {
      const [vatRate] = await db
        .insert(vatRates)
        .values({
          organizationId: orgId,
          code: "UN81",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2026-01-01"),
        })
        .returning();
      assertNonNullish(vatRate);

      const current = await store.find({ pKey: settingsId });

      if (current.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      assertNonNullish(current.result);

      const set = await store.update({
        pKey: settingsId,
        values: { version: current.result.version, vatRateId: vatRate.id },
      });

      if (set.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(set.result.vatRateId).toBe(vatRate.id);

      const cleared = await store.update({
        pKey: settingsId,
        values: { version: set.result.version, vatRateId: null },
      });

      if (cleared.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(cleared.result.vatRateId).toBeNull();
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: settingsId,
        values: { version: 999, paymentTermDays: 20 },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, paymentTermDays: 30 },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for the settings row of another organization", async () => {
      const result = await store.update({
        pKey: otherSettingsId,
        values: { version: 1, paymentTermDays: 30 },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the settings row of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(settingsId);
      expect(result.result[0]?.paymentTermDays).toBe(10);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id once the org has none and returns it parsed", async () => {
      await db.delete(billingSettings).where(eq(billingSettings.organizationId, orgId));

      const result = await collectionStore.insert({
        values: {},
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.paymentTermDays).toBe(30);
      expect(result.result.version).toBe(1);
    });
  });
});
