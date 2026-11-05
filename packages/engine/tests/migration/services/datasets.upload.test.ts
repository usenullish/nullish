import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MigrationDatasetType, MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { UploadDatasetsService } from "../../../src/migration/services/datasets.upload";
import { EngineError } from "../../../src/errors";
import {
  bexioClientsCsv,
  createMigration,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("UploadDatasetsService", () => {
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

  afterEach(() => {
    spyOn(console, "error").mockRestore();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    migrationId = await createMigration(db, organizationId, TEST_USER_ID);
  });

  const upload = ({
    file,
    type,
  }: {
    file: Uint8Array<ArrayBuffer>;
    type: MigrationDatasetType.CLIENTS;
  }) =>
    UploadDatasetsService.create({ db, userId: TEST_USER_ID, migrationId }).upload({
      file,
      type,
      name: "contacts.csv",
    });

  test("stores the dataset parsed from the file and returns it without its data", async () => {
    const result = await upload({
      file: bexioClientsCsv([{ type: "Firma", name: "Muster AG", city: "Zürich" }]),
      type: MigrationDatasetType.CLIENTS,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.result).toMatchObject({
      type: MigrationDatasetType.CLIENTS,
      name: "contacts.csv",
    });
    expect(result.result).not.toHaveProperty("data");

    const [row] = await db.select().from(datasets).where(eq(datasets.id, result.result.id));

    expect(row?.organizationId).toBe(organizationId);
    expect(row?.migrationId).toBe(migrationId);
    expect(row?.data).toEqual([
      expect.objectContaining({ type: "company", name: "Muster AG", city: "Zürich", contacts: [] }),
    ]);
  });

  test("returns an EngineError when the file cannot be read", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const result = await upload({
      file: bexioClientsCsv([{ type: "Unknown", name: "Muster AG" }]),
      type: MigrationDatasetType.CLIENTS,
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;

    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err).toHaveProperty(
      "message",
      "The file contacts.csv could not be read as clients",
    );
    expect(consoleError).toHaveBeenCalled();
  });

  test("returns an EngineError when the migration is no longer a draft", async () => {
    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, migrationId));

    const result = await upload({
      file: bexioClientsCsv([{ type: "Firma", name: "Muster AG" }]),
      type: MigrationDatasetType.CLIENTS,
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;

    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err).toHaveProperty(
      "message",
      expect.stringContaining("files can only be added while it is a draft"),
    );

    const rows = await db.select().from(datasets).where(eq(datasets.migrationId, migrationId));

    expect(rows).toHaveLength(0);
  });

  describe("replace", () => {
    const uploadClients = async () => {
      const result = await upload({
        file: bexioClientsCsv([{ type: "Firma", name: "Muster AG" }]),
        type: MigrationDatasetType.CLIENTS,
      });

      if (result.status === "error") {
        throw result.err;
      }

      return result.result;
    };

    const replace = ({
      datasetId,
      type,
    }: {
      datasetId: string;
      type: MigrationDatasetType.CLIENTS;
    }) =>
      UploadDatasetsService.create({ db, userId: TEST_USER_ID, migrationId }).replace({
        datasetId,
        file: bexioClientsCsv([{ type: "Firma", name: "Beispiel GmbH" }]),
        type,
        name: "clients-2.csv",
      });

    test("replaces the name and the data of a dataset of the draft migration", async () => {
      const dataset = await uploadClients();

      const result = await replace({ datasetId: dataset.id, type: MigrationDatasetType.CLIENTS });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.id).toBe(dataset.id);
      expect(result.result.name).toBe("clients-2.csv");
      expect(result.result.version).toBe(2);

      const [row] = await db.select().from(datasets).where(eq(datasets.id, dataset.id));

      expect(row?.data).toEqual([expect.objectContaining({ name: "Beispiel GmbH" })]);
    });

    test("returns an EngineError when the file is of another type", async () => {
      const dataset = await uploadClients();

      const result = await UploadDatasetsService.create({
        db,
        userId: TEST_USER_ID,
        migrationId,
      }).replace({
        datasetId: dataset.id,
        file: bexioClientsCsv([{ type: "Firma", name: "Beispiel GmbH" }]),
        type: MigrationDatasetType.ACCOUNTS,
        name: "accounts.xlsx",
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(EngineError);
    });

    test("returns an EngineError when the migration is no longer a draft", async () => {
      const dataset = await uploadClients();

      await db
        .update(migrations)
        .set({ status: MigrationStatus.FAILED })
        .where(eq(migrations.id, migrationId));

      const result = await replace({ datasetId: dataset.id, type: MigrationDatasetType.CLIENTS });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(EngineError);
    });
  });
});
