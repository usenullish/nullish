import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  DbAccountingSettings,
  DbCollectionAccountingSettings,
} from "../../../src/core/records/accounting-settings";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const accountingSettings = DbSchema.Core.Accounting.AccountingSettingsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const settingsIdFor = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(accountingSettings)
    .where(eq(accountingSettings.organizationId, organizationId));
  assertNonNullish(row);
  return row.id;
};

describe("accounting-settings", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbAccountingSettings;
  let collectionStore: DbCollectionAccountingSettings;
  let settingsId: string;
  let siblingSettingsId: string;
  let otherSettingsId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbAccountingSettings.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionAccountingSettings.create({
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
    test("changes the base currency and bumps the version", async () => {
      const result = await store.update({
        pKey: settingsId,
        values: { version: 1, baseCurrency: "EUR" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.baseCurrency).toBe("EUR");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: settingsId,
        values: { version: 999, baseCurrency: "USD" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, baseCurrency: "CHF" },
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
        values: { version: 1, baseCurrency: "CHF" },
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
      expect(result.result[0]?.baseCurrency).toBe("EUR");
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id once the org has none and returns it parsed", async () => {
      await db.delete(accountingSettings).where(eq(accountingSettings.organizationId, orgId));

      const result = await collectionStore.insert({
        values: {},
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.baseCurrency).toBe("CHF");
      expect(result.result.version).toBe(1);
    });
  });
});
