import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
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

describe("check_datasets_organization", () => {
  let organizationId: string;
  let migrationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    migrationId = await createMigration(db, organizationId);

    otherOrganizationId = await createOrganization(db);
  });

  test("accepts a dataset with the organization of its migration", async () => {
    const fileId = await createMigrationDataset(db, organizationId, migrationId);

    expect(fileId).toBeDefined();
  });

  test("rejects a dataset with another organization than its migration", async () => {
    const error = await createMigrationDataset(db, otherOrganizationId, migrationId).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent migration.migrations",
    );
  });
});
