import { selectMany, type Tx, updateMany } from "@usenullish/nullish-db";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { and, eq } from "drizzle-orm";

type SelectDatasets = Records["Migration"]["Datasets"]["Select"];
type InsertDatasets = Records["Migration"]["Datasets"]["Insert"];
type UpdateDatasets = Records["Migration"]["Datasets"]["Update"];
type SelectMigrations = Records["Migration"]["Migrations"]["Select"];

export const insertDataset = async ({
  tx,
  migration: { id: migrationId, organizationId },
  values,
}: {
  tx: Tx;
  migration: Pick<SelectMigrations, "id" | "organizationId">;
  values: InsertDatasets;
}): Promise<SelectDatasets> => {
  const rows = await tx
    .insert(DbSchema.Migration.Datasets.DatasetsSchema)
    .values({ ...values, migrationId, organizationId })
    .returning();

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema.parse(row);
};

export const getDataset = async ({
  tx,
  migrationId,
  id,
}: {
  tx: Tx;
  migrationId: SelectMigrations["id"];
  id: SelectDatasets["id"];
}): Promise<SelectDatasets> => {
  const datasets = await selectMany({
    tx,
    table: DbSchema.Migration.Datasets.DatasetsSchema,
    schema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    where: and(
      eq(DbSchema.Migration.Datasets.DatasetsSchema.id, id),
      eq(DbSchema.Migration.Datasets.DatasetsSchema.migrationId, migrationId),
    ),
  });

  assertArrayExactlyOne(datasets);

  const [dataset] = datasets;
  return dataset;
};

export const updateDataset = async ({
  tx,
  id,
  values,
}: {
  tx: Tx;
  id: SelectDatasets["id"];
  values: Partial<Omit<UpdateDatasets, "version">>;
}): Promise<SelectDatasets> => {
  const datasets = await updateMany<SelectDatasets, Db["Migration"]["Datasets"]>({
    tx,
    table: DbSchema.Migration.Datasets.DatasetsSchema,
    values,
    returningSchema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    where: eq(DbSchema.Migration.Datasets.DatasetsSchema.id, id),
  });

  assertArrayExactlyOne(datasets);

  const [dataset] = datasets;
  return dataset;
};
