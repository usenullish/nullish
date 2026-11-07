import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationDatasetType, MigrationStatus } from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { listDatasetSummaries } from "../../../src/migration/_helpers/dataset-summaries";
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

describe("migration/_helpers/dataset-summaries", () => {
  const datasets = DbSchema.Migration.Datasets.DatasetsSchema;
  const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

  const seedDataset = async ({
    organizationId,
    migrationId,
    type,
    name,
  }: {
    organizationId: string;
    migrationId: string;
    type: MigrationDatasetType;
    name: string;
  }) => {
    await db.insert(datasets).values({ organizationId, migrationId, type, name, data: [] });
  };

  const succeed = async (migrationId: string) => {
    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, migrationId));
  };

  const names = (summaries: Composites["DatasetSummaries"]["Select"][]): string[] =>
    summaries.map(({ dataset }) => dataset.name).toSorted();

  let organizationId: string;
  let succeededMigrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    succeededMigrationId = await createMigration(db, organizationId, TEST_USER_ID);
    await seedDataset({
      organizationId,
      migrationId: succeededMigrationId,
      type: MigrationDatasetType.JOURNAL,
      name: "journal-2021.csv",
    });
    await seedDataset({
      organizationId,
      migrationId: succeededMigrationId,
      type: MigrationDatasetType.CLIENTS,
      name: "clients.csv",
    });
    await succeed(succeededMigrationId);

    const draftMigrationId = await createMigration(db, organizationId, TEST_USER_ID);
    await seedDataset({
      organizationId,
      migrationId: draftMigrationId,
      type: MigrationDatasetType.JOURNAL,
      name: "journal-2022.csv",
    });

    const otherOrganizationId = await createOrganization(db, TEST_OTHER_USER_ID);
    const otherMigrationId = await createMigration(db, otherOrganizationId, TEST_OTHER_USER_ID);
    await seedDataset({
      organizationId: otherOrganizationId,
      migrationId: otherMigrationId,
      type: MigrationDatasetType.JOURNAL,
      name: "other.csv",
    });
    await succeed(otherMigrationId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const list = (filters?: Composites["DatasetSummaries"]["Filter"]) =>
    db.transaction((tx) =>
      listDatasetSummaries({
        tx,
        organizationId,
        filters,
        orderBy: [asc(datasets.createdAt)],
        pagination: { limit: 100, offset: 0 },
      }),
    );

  describe("listDatasetSummaries", () => {
    test("returns the datasets of the organization with their migration", async () => {
      const result = await list();

      expect(names(result)).toEqual(["clients.csv", "journal-2021.csv", "journal-2022.csv"]);

      for (const { migration } of result) {
        expect(migration.organizationId).toBe(organizationId);
      }
    });

    test("does not return the data of the datasets", async () => {
      const result = await list();

      for (const { dataset } of result) {
        expect(dataset).not.toHaveProperty("data");
      }
    });

    test("filters by the type of the dataset", async () => {
      const result = await list({ type: MigrationDatasetType.JOURNAL });

      expect(names(result)).toEqual(["journal-2021.csv", "journal-2022.csv"]);
    });

    test("filters by the status of the migration", async () => {
      const result = await list({ status: MigrationStatus.SUCCEEDED });

      expect(names(result)).toEqual(["clients.csv", "journal-2021.csv"]);
      expect(result.every(({ migration }) => migration.id === succeededMigrationId)).toBeTrue();
    });

    test("combines the filters", async () => {
      const result = await list({
        type: MigrationDatasetType.JOURNAL,
        status: MigrationStatus.SUCCEEDED,
      });

      expect(names(result)).toEqual(["journal-2021.csv"]);
    });
  });
});
