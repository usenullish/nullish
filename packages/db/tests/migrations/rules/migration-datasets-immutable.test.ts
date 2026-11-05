import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createMigration,
  createMigrationDataset,
  createOrganization,
  migrationDatasets,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_datasets_immutable", () => {
  let organizationId: string;
  let fileId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    const migrationId = await createMigration(db, organizationId);
    fileId = await createMigrationDataset(db, organizationId, migrationId);
  });

  test("allows updating the name and the data while the migration is a draft", async () => {
    const [row] = await db
      .update(migrationDatasets)
      .set({ name: "renamed.xlsx", data: [{ code: "1000" }] })
      .where(eq(migrationDatasets.id, fileId))
      .returning();

    expect(row?.name).toBe("renamed.xlsx");
    expect(row?.data).toEqual([{ code: "1000" }]);
  });

  test("rejects changing the type", async () => {
    const error = await db
      .update(migrationDatasets)
      .set({ type: MigrationDatasetType.ACCOUNTS })
      .where(eq(migrationDatasets.id, fileId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });

  test("rejects moving the dataset to another migration", async () => {
    const otherMigrationId = await createMigration(db, organizationId);

    const error = await db
      .update(migrationDatasets)
      .set({ migrationId: otherMigrationId })
      .where(eq(migrationDatasets.id, fileId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified");
  });
});
