import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";

type SelectDatasets = Records["Migration"]["Datasets"]["Select"];
type SelectMigrations = Records["Migration"]["Migrations"]["Select"];

export const listDatasets = async ({
  tx,
  migrationId,
}: {
  tx: Tx;
  migrationId: SelectMigrations["id"];
}): Promise<SelectDatasets[]> =>
  await selectMany({
    tx,
    table: DbSchema.Migration.Datasets.DatasetsSchema,
    schema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    where: eq(DbSchema.Migration.Datasets.DatasetsSchema.migrationId, migrationId),
  });
