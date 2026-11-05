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

describe("check_dataset_editable", () => {
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

  test("allows inserting a dataset while the migration is a draft", async () => {
    const fileId = await createMigrationDataset(db, organizationId, migrationId);

    expect(fileId).toBeDefined();
  });

  test("allows deleting a dataset while the migration is a draft", async () => {
    const fileId = await createMigrationDataset(db, organizationId, migrationId);

    const deleted = await db
      .delete(migrationDatasets)
      .where(eq(migrationDatasets.id, fileId))
      .returning();

    expect(deleted).toHaveLength(1);
  });

  test("rejects inserting a dataset once the migration is no longer a draft", async () => {
    await setStatus(migrationId, MigrationStatus.SUCCEEDED);

    const error = await createMigrationDataset(db, organizationId, migrationId).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects updating a dataset once the migration is no longer a draft", async () => {
    const fileId = await createMigrationDataset(db, organizationId, migrationId);
    await setStatus(migrationId, MigrationStatus.SUCCEEDED);

    const error = await db
      .update(migrationDatasets)
      .set({ name: "renamed.xlsx" })
      .where(eq(migrationDatasets.id, fileId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects deleting a dataset once the migration is no longer a draft", async () => {
    const fileId = await createMigrationDataset(db, organizationId, migrationId);
    await setStatus(migrationId, MigrationStatus.SUCCEEDED);

    const error = await db
      .delete(migrationDatasets)
      .where(eq(migrationDatasets.id, fileId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects inserting a dataset into a failed migration", async () => {
    await setStatus(migrationId, MigrationStatus.FAILED);

    const error = await createMigrationDataset(db, organizationId, migrationId).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("cannot be modified");
  });
});
