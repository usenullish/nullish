import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, MigrationDatasetType, MigrationProvider } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../../../../_test-utils";
import { listDatasets } from "../../../../../src/jobs/workers/migrations/_helpers/datasets";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;

describe("listDatasets", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    organizationId = await createOrganization({ db, withAddress: false });
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  const createMigration = async (): Promise<string> => {
    const [migration] = await db
      .insert(migrations)
      .values({ organizationId, userId: TEST_USER_ID, provider: MigrationProvider.BEXIO })
      .returning();
    assertNonNullish(migration);
    return migration.id;
  };

  test("lists the datasets of the migration only", async () => {
    const migrationId = await createMigration();
    const otherMigrationId = await createMigration();

    const [dataset] = await db
      .insert(datasets)
      .values({
        organizationId,
        migrationId,
        type: MigrationDatasetType.CLIENTS,
        name: "clients.csv",
        data: [],
      })
      .returning();
    assertNonNullish(dataset);

    const listed = await db.transaction((tx) => listDatasets({ tx, migrationId }));
    const others = await db.transaction((tx) =>
      listDatasets({ tx, migrationId: otherMigrationId }),
    );

    expect(listed.map(({ id }) => id)).toEqual([dataset.id]);
    expect(others).toEqual([]);
  });
});
