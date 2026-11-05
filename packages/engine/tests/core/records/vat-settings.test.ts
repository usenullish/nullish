import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DbCollectionVatSettings, DbVatSettings } from "../../../src/core/records/vat-settings";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedSettings = async (organizationId: string, vatNumber: string): Promise<string> => {
  const [row] = await db
    .insert(vatSettings)
    .values({
      organizationId,
      vatNumber,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("vat-settings", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbVatSettings;
  let collectionStore: DbCollectionVatSettings;
  let vatSettingsId: string;
  let siblingVatSettingsId: string;
  let otherVatSettingsId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbVatSettings.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionVatSettings.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE core.vat_settings CASCADE;`);

    vatSettingsId = await seedSettings(orgId, "CHE-123.456.789 MWST");
    siblingVatSettingsId = await seedSettings(siblingOrgId, "CHE-555.555.555 MWST");
    otherVatSettingsId = await seedSettings(otherOrgId, "CHE-987.654.321 TVA");
  });

  describe("findById", () => {
    test("returns the settings row of the caller's organization", async () => {
      const result = await store.find({ pKey: vatSettingsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(vatSettingsId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns the settings row of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingVatSettingsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingVatSettingsId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for the settings row of another organization", async () => {
      const result = await store.find({ pKey: otherVatSettingsId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the VAT number and bumps the version", async () => {
      const result = await store.update({
        pKey: vatSettingsId,
        values: {
          version: 1,
          vatNumber: "CHE-111.222.333 TVA",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.vatNumber).toBe("CHE-111.222.333 TVA");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: vatSettingsId,
        values: {
          version: 999,
          vatNumber: "CHE-111.222.333 TVA",
        },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: {
          version: 1,
          vatNumber: "CHE-111.222.333 TVA",
        },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for the settings row of another organization", async () => {
      const result = await store.update({
        pKey: otherVatSettingsId,
        values: {
          version: 1,
          vatNumber: "CHE-111.222.333 TVA",
        },
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
      expect(result.result[0]?.id).toBe(vatSettingsId);
      expect(result.result[0]?.organizationId).toBe(orgId);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id once the org has none and returns it parsed", async () => {
      await db.delete(vatSettings).where(eq(vatSettings.organizationId, orgId));

      const result = await collectionStore.insert({
        values: {
          vatNumber: "CHE-111.222.333 MWST",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.vatNumber).toBe("CHE-111.222.333 MWST");
      expect(result.result.version).toBe(1);
    });
  });
});
