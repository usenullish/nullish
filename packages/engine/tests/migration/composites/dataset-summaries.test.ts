import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationDatasetType, MigrationStatus } from "@usenullish/nullish-schema/db";
import { DbCollectionDatasetSummaries } from "../../../src/migration/composites/dataset-summaries";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("DbCollectionDatasetSummaries", () => {
  const datasets = DbSchema.Migration.Datasets.DatasetsSchema;
  const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    const migrationId = await createMigration(db, organizationId, TEST_USER_ID);

    await db.insert(datasets).values([
      {
        organizationId,
        migrationId,
        type: MigrationDatasetType.JOURNAL,
        name: "journal-2021.csv",
        data: [],
      },
      {
        organizationId,
        migrationId,
        type: MigrationDatasetType.CLIENTS,
        name: "clients.csv",
        data: [],
      },
    ]);

    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, migrationId));
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const list = ({
    userId = TEST_USER_ID,
    field = "createdAt",
  }: {
    userId?: string;
    field?: string;
  } = {}) =>
    DbCollectionDatasetSummaries.create({ db, userId, foreignKeyId: organizationId }).list({
      filters: { type: MigrationDatasetType.JOURNAL, status: MigrationStatus.SUCCEEDED },
      pagination: { limit: 100, offset: 0 },
      sort: { field, direction: "asc" },
    });

  test("lists the datasets matching the filters with their migration", async () => {
    const result = await list();

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result.map(({ dataset }) => dataset.name)).toEqual(["journal-2021.csv"]);
    expect(result.result[0]?.migration.status).toBe(MigrationStatus.SUCCEEDED);
  });

  test("returns an error Result for a field that is not a column of the dataset", async () => {
    const result = await list({ field: "status" });

    expect(result.status).toBe("error");
  });

  test("lists nothing to a user outside the organization", async () => {
    const result = await list({ userId: TEST_OTHER_USER_ID });

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result).toEqual([]);
  });
});
