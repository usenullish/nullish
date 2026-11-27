import type { Option, Result } from "@usenullish/nullish-common";
import type { DbUserContextArgs } from "@usenullish/nullish-db";
import type { QueryArgs, QueryCount, QueryDefaultSortField } from "@usenullish/nullish-schema/db";

export interface DbStore<TSelect, TSelectId, TUpdate> {
  find(args: { pKey: TSelectId }): Promise<Result<Option<TSelect>>>;
  update(args: { values: TUpdate; pKey: TSelectId }): Promise<Result<TSelect>>;
}

export interface DbDeletableStore<TSelect, TSelectId> {
  delete(args: { pKey: TSelectId }): Promise<Result<Option<TSelect>>>;
}

export interface DbListResult<TSelect> {
  data: TSelect[];
  pagination?: { total: number };
}

export type DbListArgs<
  TSortField extends string = QueryDefaultSortField,
  TFilters = never,
> = QueryArgs<TSortField> & { filters?: TFilters };

export type DbListWithCountArgs<
  TSortField extends string = QueryDefaultSortField,
  TFilters = never,
> = DbListArgs<TSortField, TFilters> & { count?: QueryCount };

export interface DbCollectionStore<
  TSelect,
  TInsert,
  TSortField extends string = QueryDefaultSortField,
  TFilters = never,
> {
  list(args: DbListWithCountArgs<TSortField, TFilters>): Promise<Result<DbListResult<TSelect>>>;
  insert(args: { values: TInsert }): Promise<Result<TSelect>>;
}

export type DbStoreInitArgs = DbUserContextArgs;

export interface DbCollectionStoreInitArgs<ForeignKeyId> extends DbStoreInitArgs {
  foreignKeyId: ForeignKeyId;
}
