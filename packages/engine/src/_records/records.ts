import { type Option, type Result, safeExec, tryCatch } from "@usenullish/nullish-common";
import {
  and,
  eq,
  getColumns,
  type InferInsertModel,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";
import { type AnyPgColumn, type AnyPgTable } from "drizzle-orm/pg-core";
import * as z from "zod";
import { type DbStoreInitArgs } from "../store";
import { assertArrayAtMostOne, assertArrayExactlyOne } from "@usenullish/nullish-common";
import { DbUserContext } from "@usenullish/nullish-db";
import { deleteMany, insertMany, selectMany, updateMany } from "@usenullish/nullish-db";
import {
  QUERY_MAX_PAGINATION,
  type QueryArgs,
  queryArgsSchema,
  type QueryPagination,
} from "@usenullish/nullish-schema/db";
import { parseQueryArgs, parseFilters } from "../_query/helpers";

export type DbRecordsSortField<TTable extends AnyPgTable> = Extract<
  keyof TTable["_"]["columns"],
  string
>;

export interface DbRecordsFilters<TFilters> {
  values: Option<TFilters>;
  schema: z.ZodType<TFilters>;
  where: (filters: TFilters) => Option<SQL>;
}

export abstract class DbRecords<
  TPrimaryKey extends string,
  TTable extends AnyPgTable & Record<TPrimaryKey | "createdAt" | "updatedAt", AnyPgColumn>,
> extends DbUserContext {
  readonly #table: TTable;
  readonly #pKey: TPrimaryKey;

  readonly #queryArgsSchema: ReturnType<
    typeof queryArgsSchema<[DbRecordsSortField<TTable>, ...DbRecordsSortField<TTable>[]]>
  >;

  protected constructor({
    table,
    pKey,
    ...rest
  }: DbStoreInitArgs & {
    table: TTable;
    pKey: TPrimaryKey;
  }) {
    super(rest);

    this.#table = table;
    this.#pKey = pKey;

    // Cast string[] to [string, ...string[]]
    const fields = Object.keys(getColumns(table)) as [
      DbRecordsSortField<TTable>,
      ...DbRecordsSortField<TTable>[],
    ];
    this.#queryArgsSchema = queryArgsSchema(fields);
  }

  protected get _table(): TTable {
    return this.#table;
  }

  protected async _queryOneByPKey<PKey, T>({
    pKey,
    schema,
  }: {
    pKey: PKey;
    schema: z.ZodType<T>;
  }): Promise<Result<Option<T>>> {
    return this._queryOne({ schema, where: eq(this.#table[this.#pKey], pKey) });
  }

  protected async _queryOne<T>({
    schema,
    where,
  }: {
    schema: z.ZodType<T>;
    where?: SQL;
  }): Promise<Result<Option<T>>> {
    const result = await this._query({
      schema,
      where,
      // assertArrayAtMostOne exists specifically to catch a data-integrity bug
      // and limit: 1 would silently truncate to the first row and hide it
      pagination: { limit: 2, offset: 0 },
      sort: { field: this.#pKey as unknown as DbRecordsSortField<TTable>, direction: "asc" },
    });

    if (result.status === "error") {
      return result;
    }

    const { result: data } = result;

    return await safeExec(async (): Promise<Result<Option<T>>> => {
      assertArrayAtMostOne(data);
      return { status: "success", result: data[0] };
    });
  }

  protected async _query<T, TFilters = never>({
    pagination,
    sort,
    where,
    filters,
    ...rest
  }: {
    schema: z.ZodType<T>;
    where?: SQL;
    filters?: DbRecordsFilters<TFilters>;
  } & QueryArgs<DbRecordsSortField<TTable>>): Promise<Result<T[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: this.#table,
        pKey: this.#table[this.#pKey],
      });

      const { where: filtersWhere } = parseFilters(filters);

      return await this._withAuth(async (tx) => {
        return await selectMany({
          tx,
          table: this.#table,
          ...queryArgs,
          ...rest,
          where: and(where, filtersWhere),
        });
      });
    });
  }

  protected _queryAll<T>(
    args: {
      schema: z.ZodType<T>;
      where?: SQL;
    } & Omit<QueryArgs<DbRecordsSortField<TTable>>, "pagination">,
  ): Promise<Result<T[]>> {
    return this.#queryAllFrom({ ...args, offset: 0, rows: [] });
  }

  async #queryAllFrom<T>({
    offset,
    rows,
    ...rest
  }: {
    schema: z.ZodType<T>;
    where?: SQL;
    rows: T[];
  } & Pick<QueryPagination, "offset"> &
    Omit<QueryArgs<DbRecordsSortField<TTable>>, "pagination">): Promise<Result<T[]>> {
    const result = await this._query({
      ...rest,
      pagination: { limit: QUERY_MAX_PAGINATION, offset },
    });

    if (result.status === "error") {
      return result;
    }

    const { result: page } = result;

    const all = [...rows, ...page];

    if (page.length < QUERY_MAX_PAGINATION) {
      return { status: "success", result: all };
    }

    return this.#queryAllFrom({ ...rest, offset: offset + QUERY_MAX_PAGINATION, rows: all });
  }

  #insert<T>(args: {
    values: Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt" | "version">;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T[]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        return insertMany({
          ...args,
          tx,
          table: this.#table,
        });
      });
    });
  }

  protected async _insertAndReturnOne<T>({
    values,
    returningSchema,
  }: {
    values: Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt" | "version">;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return await this.#runAndReturnOne<T>({
      fn: async () => {
        return await this.#insert({ values, returningSchema });
      },
      returningSchema,
    });
  }

  protected _insertAndSelect<T>(
    args: {
      values: Omit<InferInsertModel<TTable>, "createdAt" | "updatedAt" | "version">;
      returningSchema: z.ZodType<T>;
    } & Pick<InferSelectModel<TTable>, TPrimaryKey>,
  ): Promise<Result<T[]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const { values, returningSchema } = args;
        const pKey = args[this.#pKey];

        await tx.insert(this.#table as AnyPgTable).values({
          ...values,
          [this.#pKey]: pKey,
        });

        const rows = await tx
          .select()
          .from(this.#table as AnyPgTable)
          .where(eq(this.#table[this.#pKey], pKey));

        return rows.map((row) => returningSchema.parse(row));
      });
    });
  }

  protected async _insertAndSelectOne<T>(
    args: {
      values: Omit<InferInsertModel<TTable>, "createdAt" | "updatedAt" | "version">;
      returningSchema: z.ZodType<T>;
    } & Pick<InferSelectModel<TTable>, TPrimaryKey>,
  ): Promise<Result<T>> {
    return await this.#runAndReturnOne<T>({
      fn: async () => {
        return await this._insertAndSelect(args);
      },
      returningSchema: args.returningSchema,
    });
  }

  #updateByPKey<PKey, T>({
    pKey,
    ...rest
  }: {
    pKey: PKey;
    values: Partial<Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt">> & {
      version: number;
    };
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T[]>> {
    return this.#updateBy({
      ...rest,
      where: eq(this.#table[this.#pKey], pKey),
    });
  }

  #updateBy<T>(args: {
    values: Partial<Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt">> & {
      version: number;
    };
    returningSchema: z.ZodType<T>;
    where: SQL;
  }): Promise<Result<T[]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        return updateMany({
          ...args,
          tx,
          table: this.#table,
        });
      });
    });
  }

  protected async _updateAndReturnOne<PKey, T>({
    pKey,
    values,
    returningSchema,
  }: {
    pKey: PKey;
    values: Partial<Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt">> & {
      version: number;
    };
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return await this.#runAndReturnOne<T>({
      fn: async () => {
        return await this.#updateByPKey({ pKey, values, returningSchema });
      },
      returningSchema,
    });
  }

  protected async _updateAndReturnOneBy<T>({
    values,
    returningSchema,
    where,
  }: {
    values: Partial<Omit<InferInsertModel<TTable>, TPrimaryKey | "createdAt" | "updatedAt">> & {
      version: number;
    };
    returningSchema: z.ZodType<T>;
    where: SQL;
  }): Promise<Result<T>> {
    return await this.#runAndReturnOne<T>({
      fn: async () => {
        return await this.#updateBy({ values, returningSchema, where });
      },
      returningSchema,
    });
  }

  protected async _deleteAndReturnOne<PKey, T>({
    pKey,
    returningSchema,
  }: {
    pKey: PKey;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<Option<T>>> {
    const result = await tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        return await deleteMany({
          tx,
          table: this.#table,
          returningSchema,
          where: eq(this.#table[this.#pKey], pKey),
        });
      });
    });

    if (result.status === "error") {
      return result;
    }

    const { result: data } = result;

    return await safeExec(async (): Promise<Result<Option<T>>> => {
      assertArrayAtMostOne(data);
      return { status: "success", result: data[0] };
    });
  }

  async #runAndReturnOne<T>({
    fn,
    returningSchema,
  }: {
    fn: () => Promise<Result<T[]>>;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    const result = await fn();

    if (result.status === "error") {
      return result;
    }

    const { result: data } = result;

    return await safeExec(async (): Promise<Result<T>> => {
      assertArrayExactlyOne(data);
      const result = returningSchema.nonoptional().parse(data[0]);
      return { status: "success", result };
    });
  }
}
