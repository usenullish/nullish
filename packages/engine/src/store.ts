import type { Option, Result } from "@usenullish/nullish-common";
import type { DbUserContextArgs } from "@usenullish/nullish-db";
import type { QueryArgs, QueryDefaultSortField } from "@usenullish/nullish-schema/db";

export interface DbStore<TSelect, TSelectId, TUpdate> {
  find(args: { pKey: TSelectId }): Promise<Result<Option<TSelect>>>;
  update(args: { values: TUpdate; pKey: TSelectId }): Promise<Result<TSelect>>;
}

export interface DbDeletableStore<TSelect, TSelectId> {
  delete(args: { pKey: TSelectId }): Promise<Result<Option<TSelect>>>;
}

export type DbListArgs<
  TSortField extends string = QueryDefaultSortField,
  TFilters = never,
> = QueryArgs<TSortField> & { filters?: TFilters };

export interface DbCollectionStore<
  TSelect,
  TInsert,
  TSortField extends string = QueryDefaultSortField,
  TFilters = never,
> {
  list(args: DbListArgs<TSortField, TFilters>): Promise<Result<TSelect[]>>;
  insert(args: { values: TInsert }): Promise<Result<TSelect>>;
}

export type DbStoreInitArgs = DbUserContextArgs;

export interface DbCollectionStoreInitArgs<ForeignKeyId> extends DbStoreInitArgs {
  foreignKeyId: ForeignKeyId;
}
