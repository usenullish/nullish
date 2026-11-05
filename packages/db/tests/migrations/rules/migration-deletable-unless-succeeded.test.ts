import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createMigration,
  createMigrationDataset,
  createOrganization,
  migrationDatasets,
  migrations,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const setStatus = (migrationId: string, status: MigrationStatus) =>
  db.update(migrations).set({ status }).where(eq(migrations.id, migrationId));

describe("check_migration_deletable_unless_succeeded", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    migrationId = await createMigration(db, organizationId);
  });

  test("allows deleting a draft migration with its datasets", async () => {
    await createMigrationDataset(db, organizationId, migrationId);

    const deleted = await db.delete(migrations).where(eq(migrations.id, migrationId)).returning();
    const datasets = await db
      .select()
      .from(migrationDatasets)
      .where(eq(migrationDatasets.migrationId, migrationId));

    expect(deleted).toHaveLength(1);
    expect(datasets).toHaveLength(0);
  });

  test("allows deleting a failed migration with its datasets", async () => {
    await createMigrationDataset(db, organizationId, migrationId);
    await setStatus(migrationId, MigrationStatus.FAILED);

    const deleted = await db.delete(migrations).where(eq(migrations.id, migrationId)).returning();
    const datasets = await db
      .select()
      .from(migrationDatasets)
      .where(eq(migrationDatasets.migrationId, migrationId));

    expect(deleted).toHaveLength(1);
    expect(datasets).toHaveLength(0);
  });

  test("rejects deleting a succeeded migration", async () => {
    await setStatus(migrationId, MigrationStatus.SUCCEEDED);

    const error = await db
      .delete(migrations)
      .where(eq(migrations.id, migrationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be deleted");
  });
});
