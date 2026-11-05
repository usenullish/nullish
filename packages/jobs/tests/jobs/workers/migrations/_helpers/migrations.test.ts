import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, tryCatch } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, MigrationProvider, MigrationStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../../../../_test-utils";
import {
  getMigration,
  updateMigrationStatus,
} from "../../../../../src/jobs/workers/migrations/_helpers/migrations";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

describe("migrations helpers", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization({ db, withAddress: false });

    const [migration] = await db
      .insert(migrations)
      .values({ organizationId, userId: TEST_USER_ID, provider: MigrationProvider.BEXIO })
      .returning();
    assertNonNullish(migration);
    migrationId = migration.id;
  });

  describe("getMigration", () => {
    test("returns the migration, locked", async () => {
      const migration = await db.transaction((tx) =>
        getMigration({ tx, id: migrationId, lock: "no key update" }),
      );

      expect(migration.id).toBe(migrationId);
      expect(migration.organizationId).toBe(organizationId);
    });

    test("rejects when the migration does not exist", async () => {
      const result = await tryCatch(() =>
        db.transaction((tx) => getMigration({ tx, id: crypto.randomUUID() })),
      );

      expect(result.status).toBe("error");
    });
  });

  describe("updateMigrationStatus", () => {
    test("changes the status of the migration", async () => {
      const updated = await db.transaction((tx) =>
        updateMigrationStatus({ tx, id: migrationId, status: MigrationStatus.SUCCEEDED }),
      );

      expect(updated.status).toBe(MigrationStatus.SUCCEEDED);
    });

    test("rejects a transition the status does not allow", async () => {
      await db.transaction((tx) =>
        updateMigrationStatus({ tx, id: migrationId, status: MigrationStatus.SUCCEEDED }),
      );

      const result = await tryCatch(() =>
        db.transaction((tx) =>
          updateMigrationStatus({ tx, id: migrationId, status: MigrationStatus.DRAFT }),
        ),
      );

      expect(result.status).toBe("error");
    });
  });
});
