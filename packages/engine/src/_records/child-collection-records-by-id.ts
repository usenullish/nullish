import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { type DbCollectionStoreInitArgs } from "../store";
import * as z from "zod";
import { type Result } from "@usenullish/nullish-common";
import { sql } from "drizzle-orm";
import { DbCollectionRecordsById } from "./collection-records-by-id";

type ParentTable = AnyPgTable & { id: AnyPgColumn; organizationId: AnyPgColumn };

export abstract class DbChildCollectionRecordsById<
  TTable extends AnyPgTable & {
    id: AnyPgColumn;
    createdAt: AnyPgColumn;
    updatedAt: AnyPgColumn;
  },
  ParentID,
> extends DbCollectionRecordsById<TTable, ParentID> {
  readonly #parentId: ParentID;
  readonly #parentTable: ParentTable;

  protected constructor({
    parentTable,
    ...rest
  }: DbCollectionStoreInitArgs<ParentID> & {
    table: TTable;
    foreignKeyColumn: AnyPgColumn;
    parentTable: ParentTable;
  }) {
    super(rest);

    this.#parentId = rest.foreignKeyId;
    this.#parentTable = parentTable;
  }

  protected override __insertWithForeignKeyId<T>({
    values,
    returningSchema,
  }: {
    values: Record<string, unknown>;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return super.__insertWithForeignKeyId({
      values: {
        ...values,
        organizationId: sql`(SELECT ${this.#parentTable.organizationId} FROM ${this.#parentTable} WHERE ${this.#parentTable.id} = ${this.#parentId})`,
      },
      returningSchema,
    });
  }
}
