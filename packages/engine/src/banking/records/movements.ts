import type { Option, Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbListArgs,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { buildMovementsWhere } from "../_helpers/movements";

type SelectMovements = Records["Banking"]["Movements"]["Select"];
type InsertMovements = Records["Banking"]["Movements"]["Insert"];
type FilterMovements = Records["Banking"]["Movements"]["Filter"];
type MovementsSortField = DbRecordsSortField<Db["Banking"]["Movements"]>;

type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];

export class DbMovements extends DbRecordsById<Db["Banking"]["Movements"]> {
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Banking.Movements.MovementsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbMovements {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectMovements["id"] }): Promise<Result<Option<SelectMovements>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
    });
  }
}

export class DbCollectionMovements
  extends DbCollectionRecordsById<Db["Banking"]["Movements"], SelectBankRelations["id"]>
  implements
    DbCollectionStore<SelectMovements, InsertMovements, MovementsSortField, FilterMovements>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectBankRelations["id"]>) {
    super({
      ...args,
      table: DbSchema.Banking.Movements.MovementsSchema,
      foreignKeyColumn: DbSchema.Banking.Movements.MovementsSchema.bankRelationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectBankRelations["id"]>): DbCollectionMovements {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<MovementsSortField, FilterMovements>): Promise<Result<SelectMovements[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Banking.MovementsSchema.FilterMovementsSchema,
        where: buildMovementsWhere,
      },
    });
  }

  insert({ values }: { values: InsertMovements }): Promise<Result<SelectMovements>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
    });
  }
}
