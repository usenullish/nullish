import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { and, eq, getColumns, type SQL } from "drizzle-orm";

type DatasetSummary = Composites["DatasetSummaries"]["Select"];
type FilterDatasetSummaries = Composites["DatasetSummaries"]["Filter"];

const buildDatasetSummariesWhere = ({ type, status }: FilterDatasetSummaries): Option<SQL> =>
  and(
    nonNullish(type) ? eq(DbSchema.Migration.Datasets.DatasetsSchema.type, type) : undefined,
    nonNullish(status)
      ? eq(DbSchema.Migration.Migrations.MigrationsSchema.status, status)
      : undefined,
  );

export const listDatasetSummaries = async ({
  tx,
  organizationId,
  filters,
  orderBy,
  pagination: { limit, offset },
}: {
  tx: Tx;
  organizationId: Records["Migration"]["Migrations"]["Select"]["organizationId"];
  filters: Option<FilterDatasetSummaries>;
} & Required<SelectManyFilterArgs>): Promise<DatasetSummary[]> => {
  const { data: _data, ...datasetColumns } = getColumns(DbSchema.Migration.Datasets.DatasetsSchema);

  const rows = await tx
    .select({
      dataset: datasetColumns,
      migration: DbSchema.Migration.Migrations.MigrationsSchema,
    })
    .from(DbSchema.Migration.Datasets.DatasetsSchema)
    .innerJoin(
      DbSchema.Migration.Migrations.MigrationsSchema,
      eq(
        DbSchema.Migration.Migrations.MigrationsSchema.id,
        DbSchema.Migration.Datasets.DatasetsSchema.migrationId,
      ),
    )
    .where(
      and(
        eq(DbSchema.Migration.Migrations.MigrationsSchema.organizationId, organizationId),
        isNullish(filters) ? undefined : buildDatasetSummariesWhere(filters),
      ),
    )
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return rows.map((row) =>
    CompositesSchema.DatasetSummariesSchema.SelectDatasetSummariesSchema.parse(row),
  );
};
