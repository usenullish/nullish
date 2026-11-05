import { sql } from "drizzle-orm";
import { type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";

type SelectMigrations = Records["Migration"]["Migrations"]["Select"];
type InsertMigrations = Records["Migration"]["Migrations"]["Insert"];

type MigrationsSortField = DbRecordsSortField<Db["Migration"]["Migrations"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbMigrations
  extends DbRecordsById<Db["Migration"]["Migrations"]>
  implements DbDeletableStore<SelectMigrations, SelectMigrations["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Migration.Migrations.MigrationsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbMigrations {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectMigrations["id"] }): Promise<Result<Option<SelectMigrations>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectMigrations["id"];
  }): Promise<Result<Option<SelectMigrations>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    });
  }
}

export class DbCollectionMigrations
  extends DbCollectionRecordsById<Db["Migration"]["Migrations"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectMigrations, InsertMigrations, MigrationsSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Migration.Migrations.MigrationsSchema,
      foreignKeyColumn: DbSchema.Migration.Migrations.MigrationsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionMigrations {
    return new this(args);
  }

  list(args: DbListArgs<MigrationsSortField>): Promise<Result<SelectMigrations[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertMigrations }): Promise<Result<SelectMigrations>> {
    return this.__insertWithForeignKeyId({
      values: { ...values, userId: sql`auth.current_user_id()` },
      returningSchema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    });
  }
}
