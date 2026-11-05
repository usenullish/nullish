import type { Option, Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbDeletableStore,
  DbListArgs,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbRecords, type DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";

type SelectCurrencies = Records["Core"]["Currencies"]["Select"];
type InsertCurrencies = Records["Core"]["Currencies"]["Insert"];
type CurrenciesSortField = DbRecordsSortField<Db["Core"]["Currencies"]>;

export class DbCurrencies
  extends DbRecords<"code", Db["Core"]["Currencies"]>
  implements
    DbStore<SelectCurrencies, SelectCurrencies["code"], unknown>,
    DbDeletableStore<SelectCurrencies, SelectCurrencies["code"]>,
    DbCollectionStore<SelectCurrencies, InsertCurrencies, CurrenciesSortField>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Currencies.CurrenciesSchema,
      pKey: "code",
    });
  }

  static create(args: DbStoreInitArgs): DbCurrencies {
    return new this(args);
  }

  find({ pKey }: { pKey: SelectCurrencies["code"] }): Promise<Result<Option<SelectCurrencies>>> {
    return this._queryOneByPKey({
      pKey,
      schema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
    });
  }

  list(args: DbListArgs<CurrenciesSortField>): Promise<Result<SelectCurrencies[]>> {
    return this._query({
      schema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertCurrencies }): Promise<Result<SelectCurrencies>> {
    return this._insertAndReturnOne({
      values,
      returningSchema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
    });
  }

  async update(_args: {
    values: unknown;
    pKey: SelectCurrencies["code"];
  }): Promise<Result<SelectCurrencies>> {
    return {
      status: "error",
      err: new EngineError("Currencies cannot be updated."),
    };
  }

  async delete(_args: {
    pKey: SelectCurrencies["code"];
  }): Promise<Result<Option<SelectCurrencies>>> {
    return {
      status: "error",
      err: new EngineError("Currencies cannot be deleted."),
    };
  }
}
