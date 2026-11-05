import { type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbChildCollectionRecordsById } from "../../_records/child-collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";

type SelectDatasets = Records["Migration"]["Datasets"]["Select"];
type InsertDatasets = Records["Migration"]["Datasets"]["Insert"];
type UpdateDatasets = Records["Migration"]["Datasets"]["Update"];

type DatasetsSortField = DbRecordsSortField<Db["Migration"]["Datasets"]>;

type SelectMigrations = Records["Migration"]["Migrations"]["Select"];

export class DbDatasets
  extends DbRecordsById<Db["Migration"]["Datasets"]>
  implements
    DbStore<SelectDatasets, SelectDatasets["id"], UpdateDatasets>,
    DbDeletableStore<SelectDatasets, SelectDatasets["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Migration.Datasets.DatasetsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbDatasets {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectDatasets["id"] }): Promise<Result<Option<SelectDatasets>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectDatasets["id"] }): Promise<Result<Option<SelectDatasets>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateDatasets, "version"> & Partial<Omit<UpdateDatasets, "version">>;
    pKey: SelectDatasets["id"];
  }): Promise<Result<SelectDatasets>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    });
  }
}

export class DbCollectionDatasets
  extends DbChildCollectionRecordsById<Db["Migration"]["Datasets"], SelectMigrations["id"]>
  implements DbCollectionStore<SelectDatasets, InsertDatasets, DatasetsSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectMigrations["id"]>) {
    super({
      ...args,
      table: DbSchema.Migration.Datasets.DatasetsSchema,
      foreignKeyColumn: DbSchema.Migration.Datasets.DatasetsSchema.migrationId,
      parentTable: DbSchema.Migration.Migrations.MigrationsSchema,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectMigrations["id"]>): DbCollectionDatasets {
    return new this(args);
  }

  list(args: DbListArgs<DatasetsSortField>): Promise<Result<SelectDatasets[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertDatasets }): Promise<Result<SelectDatasets>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema,
    });
  }
}
