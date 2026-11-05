import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createMigration,
  createMigrationDataset,
  createOrganization,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("datasets_migration_type_uidx", () => {
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

  test.each(
    [
      MigrationDatasetType.ACCOUNTS,
      MigrationDatasetType.BALANCES,
      MigrationDatasetType.CLIENTS,
      MigrationDatasetType.INVOICES,
    ].map((type) => [type]),
  )("rejects a second %s dataset in the same migration", async (type) => {
    await createMigrationDataset(db, organizationId, migrationId, type);

    const error = await createMigrationDataset(db, organizationId, migrationId, type).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("datasets_migration_type_uidx");
  });

  test("allows several journal datasets in the same migration", async () => {
    await createMigrationDataset(db, organizationId, migrationId, MigrationDatasetType.JOURNAL);

    const fileId = await createMigrationDataset(
      db,
      organizationId,
      migrationId,
      MigrationDatasetType.JOURNAL,
    );

    expect(fileId).toBeDefined();
  });

  test("allows the same type in another migration", async () => {
    await createMigrationDataset(db, organizationId, migrationId, MigrationDatasetType.ACCOUNTS);
    const otherMigrationId = await createMigration(db, organizationId);

    const fileId = await createMigrationDataset(
      db,
      organizationId,
      otherMigrationId,
      MigrationDatasetType.ACCOUNTS,
    );

    expect(fileId).toBeDefined();
  });
});
