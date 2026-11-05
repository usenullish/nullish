import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { encodeWithCodecs } from "@usenullish/nullish-common";
import {
  ClientType,
  DbSchema,
  MigrationDatasetType,
  MigrationStatus,
} from "@usenullish/nullish-schema/db";
import { MigrationSchema } from "@usenullish/nullish-schema/migration";
import { EngineError } from "@usenullish/nullish-engine";
import { JobsMigrationService } from "@usenullish/nullish-engine/migration";
import { envDbUrl } from "@usenullish/nullish-env";
import { startJobs } from "../../src/start";
import type { TriggeredJobs } from "../../src/jobs.triggered";
import type { ScheduledJobs } from "../../src/jobs.scheduled";
import {
  createMigration,
  createOrganization,
  resetDb,
  seedUser,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  waitFor,
} from "../_test-utils";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("JobsMigrationService", () => {
  let jobs: TriggeredJobs;
  let scheduledJobs: ScheduledJobs;
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });

    const started = await startJobs();

    if (started.status === "error") {
      throw started.err;
    }

    jobs = started.result.triggered;
    scheduledJobs = started.result.scheduled;
  });

  afterAll(async () => {
    await jobs.stop();
    await scheduledJobs.stop();
    await resetDb({ db });
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization({ db, withAddress: false });
    migrationId = await createMigration({ db, organizationId });
  });

  const service = ({ id = migrationId }: { id?: string } = {}) =>
    JobsMigrationService.create({ db, userId: TEST_USER_ID, migrationId: id, jobs });

  const statusOf = async (): Promise<MigrationStatus | undefined> => {
    const [row] = await db.select().from(migrations).where(eq(migrations.id, migrationId));
    return row?.status;
  };

  test("triggers the job that imports the migration", async () => {
    await db.insert(datasets).values({
      organizationId,
      migrationId,
      type: MigrationDatasetType.CLIENTS,
      name: "clients.csv",
      data: encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignClientsSchema,
        value: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
      }),
    });

    const result = await service().start();

    expect(result.status).toBe("success");

    const status = await waitFor(statusOf, (current) => current === MigrationStatus.SUCCEEDED);

    expect(status).toBe(MigrationStatus.SUCCEEDED);
  }, 15000);

  test("returns an EngineError for a migration that already succeeded", async () => {
    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, migrationId));

    const result = await service().start();

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(EngineError);
  });

  test("returns an error Result for a migration of another organization", async () => {
    const otherOrganizationId = await createOrganization({
      db,
      withAddress: false,
      userId: TEST_OTHER_USER_ID,
    });
    const otherMigrationId = await createMigration({
      db,
      organizationId: otherOrganizationId,
      userId: TEST_OTHER_USER_ID,
    });

    const result = await service({ id: otherMigrationId }).start();

    expect(result.status).toBe("error");
  });

  test("returns an error Result for a migration that does not exist", async () => {
    const result = await service({ id: crypto.randomUUID() }).start();

    expect(result.status).toBe("error");
  });

  test("returns the state of the job of the migration", async () => {
    const started = await service().start();

    if (started.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const state = await waitFor(
      () => service().jobState({ jobId: started.result.jobId }),
      (result) => result.status === "success" && result.result.status === "completed",
    );

    expect(state).toEqual({
      status: "success",
      result: { status: "completed", result: null },
    });
  }, 15000);

  test("returns an error Result for the job state of a migration of another organization", async () => {
    const otherOrganizationId = await createOrganization({
      db,
      withAddress: false,
      userId: TEST_OTHER_USER_ID,
    });
    const otherMigrationId = await createMigration({
      db,
      organizationId: otherOrganizationId,
      userId: TEST_OTHER_USER_ID,
    });

    const result = await service({ id: otherMigrationId }).jobState({
      jobId: crypto.randomUUID(),
    });

    expect(result.status).toBe("error");
  });

  test("returns an error Result for the job of another migration of the organization", async () => {
    const started = await service().start();

    if (started.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const otherMigrationId = await createMigration({ db, organizationId });

    const result = await service({ id: otherMigrationId }).jobState({
      jobId: started.result.jobId,
    });

    expect(result.status).toBe("error");
  });
});
