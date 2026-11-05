import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { MigrationProvider, MigrationStatus } from "@usenullish/nullish-schema/db";
import { getMigration } from "../../../src/migration/_helpers/migrations";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("getMigration", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    migrationId = await createMigration(db, organizationId, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns the migration", async () => {
    const migration = await db.transaction((tx) => getMigration({ tx, id: migrationId }));

    expect(migration.id).toBe(migrationId);
    expect(migration.organizationId).toBe(organizationId);
    expect(migration.userId).toBe(TEST_USER_ID);
    expect(migration.provider).toBe(MigrationProvider.BEXIO);
    expect(migration.status).toBe(MigrationStatus.DRAFT);
  });

  test("rejects when the migration does not exist", async () => {
    await expect(
      db.transaction((tx) => getMigration({ tx, id: TEST_MISSING_ID })),
    ).rejects.toThrow();
  });
});
