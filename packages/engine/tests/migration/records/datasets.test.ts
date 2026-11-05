import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationDatasetType, MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionDatasets, DbDatasets } from "../../../src/migration/records/datasets";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIST_ARGS = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt", direction: "asc" },
} as const;

describe("datasets", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const collection = ({
    migrationId,
    userId = TEST_USER_ID,
  }: {
    migrationId: string;
    userId?: string;
  }) => DbCollectionDatasets.create({ db, userId, foreignKeyId: migrationId });

  const store = ({ userId = TEST_USER_ID }: { userId?: string } = {}) =>
    DbDatasets.create({ db, userId });

  const insertDataset = async ({ migrationId }: { migrationId: string }) => {
    const result = await collection({ migrationId }).insert({
      values: { type: MigrationDatasetType.JOURNAL, name: "journal.xlsx", data: [] },
    });

    if (result.status === "error") {
      throw result.err;
    }

    return result.result;
  };

  describe("insert", () => {
    test("inserts a dataset into the migration and its organization", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);

      const dataset = await insertDataset({ migrationId });

      const [row] = await db.select().from(datasets).where(eq(datasets.id, dataset.id));

      expect(row?.migrationId).toBe(migrationId);
      expect(row?.organizationId).toBe(organizationId);
      expect(dataset.version).toBe(1);
    });

    test("returns an error Result for a migration of another organization", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);

      const result = await collection({ migrationId, userId: TEST_OTHER_USER_ID }).insert({
        values: { type: MigrationDatasetType.JOURNAL, name: "journal.xlsx", data: [] },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list", () => {
    test("lists the datasets of the migration only", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      const otherMigrationId = await createMigration(db, organizationId, TEST_USER_ID);

      const dataset = await insertDataset({ migrationId });
      await insertDataset({ migrationId: otherMigrationId });

      const result = await collection({ migrationId }).list(LIST_ARGS);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual([dataset.id]);
    });

    test("lists no dataset to a user outside the organization", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      await insertDataset({ migrationId });

      const result = await collection({ migrationId, userId: TEST_OTHER_USER_ID }).list(LIST_ARGS);

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("update", () => {
    test("updates a dataset of a draft migration and bumps its version", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      const dataset = await insertDataset({ migrationId });

      const result = await store().update({
        pKey: dataset.id,
        values: { version: dataset.version, name: "journal-2025.xlsx" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("journal-2025.xlsx");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result for a dataset of a migration that is no longer a draft", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      const dataset = await insertDataset({ migrationId });

      await db
        .update(migrations)
        .set({ status: MigrationStatus.FAILED })
        .where(eq(migrations.id, migrationId));

      const result = await store().update({
        pKey: dataset.id,
        values: { version: dataset.version, name: "journal-2025.xlsx" },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("delete", () => {
    test("deletes a dataset of a draft migration and returns it", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      const dataset = await insertDataset({ migrationId });

      const result = await store().delete({ pKey: dataset.id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(dataset.id);
      expect(await store().find({ pKey: dataset.id })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("resolves to undefined and keeps a dataset of another organization", async () => {
      const migrationId = await createMigration(db, organizationId, TEST_USER_ID);
      const dataset = await insertDataset({ migrationId });

      const result = await store({ userId: TEST_OTHER_USER_ID }).delete({ pKey: dataset.id });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await store().find({ pKey: dataset.id });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(dataset.id);
    });
  });
});
