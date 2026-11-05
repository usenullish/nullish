import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { assertNonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  ClientType,
  DbSchema,
  MigrationDatasetType,
  MigrationProvider,
  MigrationStatus,
} from "@usenullish/nullish-schema/db";
import type { Jobs } from "@usenullish/nullish-schema/jobs";
import { MigrationSchema } from "@usenullish/nullish-schema/migration";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../_test-utils";
import { MigrationJob } from "../../src/jobs/migrations";

const dbUrl = envDbUrl();

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;

class TestMigrationJob extends MigrationJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestMigrationJob {
    return new this({ dbUrl });
  }

  run(args: { payload: Jobs["Migrations"]["Payload"] }): Promise<Jobs["Migrations"]["Result"]> {
    return this.worker(args);
  }
}

describe("MigrationJob", () => {
  let job: TestMigrationJob;
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    await setupJobQueuesDb({ dbUrl });
    job = TestMigrationJob.create({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
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

  const addClientsDataset = ({ data }: { data: unknown }) =>
    db.insert(datasets).values({
      organizationId,
      migrationId,
      type: MigrationDatasetType.CLIENTS,
      name: "clients.csv",
      data,
    });

  const statusOf = async (): Promise<MigrationStatus | undefined> => {
    const [row] = await db.select().from(migrations).where(eq(migrations.id, migrationId));
    return row?.status;
  };

  test("imports the datasets of the migration", async () => {
    await addClientsDataset({
      data: encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignClientsSchema,
        value: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
      }),
    });

    const result = await job.run({ payload: { userId: TEST_USER_ID, migrationId } });

    expect(result).toBeNull();
    expect(await statusOf()).toBe(MigrationStatus.SUCCEEDED);

    const imported = await db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, organizationId));

    expect(imported.map(({ name }) => name)).toEqual(["Muster AG"]);
  });

  test("throws when the import fails and marks the migration as failed", async () => {
    await addClientsDataset({ data: [{ name: "" }] });

    const error = await job
      .run({ payload: { userId: TEST_USER_ID, migrationId } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(await statusOf()).toBe(MigrationStatus.FAILED);
  });
});
