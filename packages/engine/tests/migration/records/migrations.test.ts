import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationProvider, MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionMigrations, DbMigrations } from "../../../src/migration/records/migrations";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("migrations", () => {
  let orgId: string;
  let otherOrgId: string;
  let store: DbMigrations;
  let collectionStore: DbCollectionMigrations;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbMigrations.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionMigrations.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("insert", () => {
    test("creates a draft migration of the current user in the organization", async () => {
      const result = await collectionStore.insert({
        values: { provider: MigrationProvider.BEXIO },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.userId).toBe(TEST_USER_ID);
      expect(result.result.provider).toBe(MigrationProvider.BEXIO);
      expect(result.result.status).toBe(MigrationStatus.DRAFT);
    });

    test("returns an error Result in an organization of another user", async () => {
      const result = await DbCollectionMigrations.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).insert({ values: { provider: MigrationProvider.BEXIO } });

      expect(result.status).toBe("error");
    });
  });

  describe("find", () => {
    test("returns a migration of the caller's organization", async () => {
      const migrationId = await createMigration(db, orgId, TEST_USER_ID);

      const result = await store.find({ pKey: migrationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(migrationId);
    });

    test("resolves to undefined for a migration of another organization", async () => {
      const migrationId = await createMigration(db, otherOrgId, TEST_OTHER_USER_ID);

      const result = await store.find({ pKey: migrationId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("list", () => {
    test("returns only the migrations of the organization", async () => {
      const migrationId = await createMigration(db, orgId, TEST_USER_ID);
      const otherMigrationId = await createMigration(db, otherOrgId, TEST_OTHER_USER_ID);

      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const ids = result.result.map(({ id }) => id);

      expect(ids).toContain(migrationId);
      expect(ids).not.toContain(otherMigrationId);
      expect(result.result.every(({ organizationId }) => organizationId === orgId)).toBeTrue();
    });
  });

  describe("delete", () => {
    test("deletes a draft migration and returns it", async () => {
      const migrationId = await createMigration(db, orgId, TEST_USER_ID);

      const result = await store.delete({ pKey: migrationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(migrationId);
      expect(await store.find({ pKey: migrationId })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("returns an error Result for a migration that is not a draft", async () => {
      const migrationId = await createMigration(db, orgId, TEST_USER_ID);

      await db
        .update(migrations)
        .set({ status: MigrationStatus.SUCCEEDED })
        .where(eq(migrations.id, migrationId));

      const result = await store.delete({ pKey: migrationId });

      expect(result.status).toBe("error");
    });

    test("resolves to undefined and keeps a migration of another organization", async () => {
      const migrationId = await createMigration(db, otherOrgId, TEST_OTHER_USER_ID);

      const result = await store.delete({ pKey: migrationId });

      expect(result).toEqual({ status: "success", result: undefined });

      const [row] = await db.select().from(migrations).where(eq(migrations.id, migrationId));

      expect(row?.id).toBe(migrationId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
