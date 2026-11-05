import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { DbRecords } from "./records";
import type { DbStoreInitArgs } from "../store";
import type { Option, Result } from "@usenullish/nullish-common";
import * as z from "zod";
import type { InferInsertModel } from "drizzle-orm";

export abstract class DbRecordsById<
  TTable extends AnyPgTable & { id: AnyPgColumn; createdAt: AnyPgColumn; updatedAt: AnyPgColumn },
> extends DbRecords<"id", TTable> {
  protected constructor(args: DbStoreInitArgs & { table: TTable }) {
    super({ ...args, pKey: "id" });
  }

  protected async _queryOneById<ID, T>({
    id,
    schema,
  }: {
    id: ID;
    schema: z.ZodType<T>;
  }): Promise<Result<Option<T>>> {
    return this._queryOneByPKey({ schema, pKey: id });
  }

  protected async _updateAndReturnOneById<ID, T>({
    id,
    ...rest
  }: {
    id: ID;
    values: Partial<Omit<InferInsertModel<TTable>, "id" | "createdAt" | "updatedAt">> & {
      version: number;
    };
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return await this._updateAndReturnOne({ ...rest, pKey: id });
  }

  protected async _deleteAndReturnOneById<ID, T>({
    id,
    returningSchema,
  }: {
    id: ID;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<Option<T>>> {
    return await this._deleteAndReturnOne({ pKey: id, returningSchema });
  }
}
