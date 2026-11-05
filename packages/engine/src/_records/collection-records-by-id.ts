import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { type DbCollectionStoreInitArgs } from "../store";
import * as z from "zod";
import { assertNonNullish, type Result } from "@usenullish/nullish-common";
import { eq, getColumns } from "drizzle-orm";
import { DbRecordsById } from "./records-by-id";
import type { DbRecordsFilters, DbRecordsSortField } from "./records";
import type { QueryArgs } from "@usenullish/nullish-schema/db";

export abstract class DbCollectionRecordsById<
  TTable extends AnyPgTable & {
    id: AnyPgColumn;
    createdAt: AnyPgColumn;
    updatedAt: AnyPgColumn;
  },
  ParentID,
> extends DbRecordsById<TTable> {
  readonly #foreignKeyId: ParentID;
  readonly #foreignKeyColumn: AnyPgColumn;

  protected constructor({
    foreignKeyId,
    foreignKeyColumn,
    ...rest
  }: DbCollectionStoreInitArgs<ParentID> & {
    table: TTable;
    foreignKeyColumn: AnyPgColumn;
  }) {
    super(rest);

    this.#foreignKeyId = foreignKeyId;
    this.#foreignKeyColumn = foreignKeyColumn;
  }

  protected _queryWithForeignKeyId<T, TFilters = never>(
    args: { schema: z.ZodType<T>; filters?: DbRecordsFilters<TFilters> } & QueryArgs<
      DbRecordsSortField<TTable>
    >,
  ): Promise<Result<T[]>> {
    return this._query({
      ...args,
      where: eq(this.#foreignKeyColumn, this.#foreignKeyId),
    });
  }

  protected _queryAllWithForeignKeyId<T>(
    args: { schema: z.ZodType<T> } & Omit<QueryArgs<DbRecordsSortField<TTable>>, "pagination">,
  ): Promise<Result<T[]>> {
    return this._queryAll({
      ...args,
      where: eq(this.#foreignKeyColumn, this.#foreignKeyId),
    });
  }

  protected __insertWithForeignKeyId<T>({
    values,
    returningSchema,
  }: {
    values: Record<string, unknown>;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    // this.#foreignKeyColumn.name return the proper DB name using snake case
    // Drizzle requires the camel case name and currently no other direct way to resolve it
    const foreignKeyColumnName = Object.entries(getColumns(this._table)).find(
      ([, column]) => column === this.#foreignKeyColumn,
    )?.[0];

    assertNonNullish(
      foreignKeyColumnName,
      `The parent column name for ${this.#foreignKeyColumn.name} cannot be resolved.`,
    );

    return this._insertAndReturnOne({
      values: {
        ...values,
        [foreignKeyColumnName]: this.#foreignKeyId,
      } as never,
      returningSchema,
    });
  }
}
