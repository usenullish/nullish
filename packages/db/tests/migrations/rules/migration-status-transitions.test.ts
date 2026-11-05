import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createMigration,
  createOrganization,
  migrations,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const setStatus = (migrationId: string, status: MigrationStatus) =>
  db.update(migrations).set({ status }).where(eq(migrations.id, migrationId)).returning();

describe("check_migration_status_transition", () => {
  let migrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    const organizationId = await createOrganization(db);
    migrationId = await createMigration(db, organizationId);
  });

  test.each([MigrationStatus.SUCCEEDED, MigrationStatus.FAILED].map((status) => [status]))(
    "allows draft -> %s",
    async (status) => {
      const [row] = await setStatus(migrationId, status);

      expect(row?.status).toBe(status);
    },
  );

  test.each([MigrationStatus.SUCCEEDED, MigrationStatus.FAILED].map((status) => [status]))(
    "allows failed -> %s",
    async (status) => {
      await setStatus(migrationId, MigrationStatus.FAILED);

      const [row] = await setStatus(migrationId, status);

      expect(row?.status).toBe(status);
    },
  );

  test("rejects failed -> draft", async () => {
    await setStatus(migrationId, MigrationStatus.FAILED);

    const error = await setStatus(migrationId, MigrationStatus.DRAFT).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("Invalid migration status transition");
  });

  test.each([MigrationStatus.DRAFT, MigrationStatus.FAILED].map((status) => [status]))(
    "rejects succeeded -> %s",
    async (status) => {
      await setStatus(migrationId, MigrationStatus.SUCCEEDED);

      const error = await setStatus(migrationId, status).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("Invalid migration status transition");
    },
  );
});
