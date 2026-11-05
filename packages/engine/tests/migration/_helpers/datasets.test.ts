import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationDatasetType } from "@usenullish/nullish-schema/db";
import { insertDataset } from "../../../src/migration/_helpers/datasets";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const datasets = DbSchema.Migration.Datasets.DatasetsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("insertDataset", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    migrationId = await createMigration(db, organizationId, TEST_USER_ID);
  });

  const data = [{ reference: "A-1", validOn: { __date__: "2026-01-15" } }];

  const insert = () =>
    db.transaction((tx) =>
      insertDataset({
        tx,
        migration: { id: migrationId, organizationId },
        values: { type: MigrationDatasetType.JOURNAL, name: "journal-2026.xlsx", data },
      }),
    );

  test("inserts and returns the dataset with its data", async () => {
    const dataset = await insert();

    expect(dataset.type).toBe(MigrationDatasetType.JOURNAL);
    expect(dataset.name).toBe("journal-2026.xlsx");
    expect(dataset.data).toEqual(data);
  });

  test("attaches the dataset to the migration and its organization", async () => {
    const { id } = await insert();

    const [row] = await db.select().from(datasets).where(eq(datasets.id, id));

    expect(row?.migrationId).toBe(migrationId);
    expect(row?.organizationId).toBe(organizationId);
  });
});
