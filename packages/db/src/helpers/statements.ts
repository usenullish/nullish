import { type InferInsertModel, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable, LockStrength } from "drizzle-orm/pg-core";
import * as z from "zod";
import { isArrayAtLeastOne, nonNullish } from "@usenullish/nullish-common";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type { SelectedFields } from "drizzle-orm/pg-core";
import type { Tx } from "../types";
import type { QueryPagination } from "@usenullish/nullish-schema/db";

interface StatementArgs {
  tx: Tx;
}

interface ReadStatementArgs extends StatementArgs {
  table: PgTable | PgView;
}

interface WriteStatementArgs extends StatementArgs {
  table: AnyPgTable;
}

export interface SelectManyFilterArgs {
  orderBy?: SQL[];
  pagination?: QueryPagination;
}

export const selectMany = async <T, Selection extends SelectedFields>({
  tx,
  table,
  schema,
  where,
  orderBy,
  pagination,
  lock,
  selection,
}: ReadStatementArgs & {
  schema: z.ZodType<T>;
  where?: SQL;
  lock?: LockStrength;
  selection?: Selection;
} & SelectManyFilterArgs): Promise<T[]> => {
  const select = nonNullish(selection) ? tx.select(selection) : tx.select();
  const query = select.from(table).where(where).$dynamic();
  const ordered =
    nonNullish(orderBy) && isArrayAtLeastOne(orderBy) ? query.orderBy(...orderBy) : query;
  const paginated = nonNullish(pagination)
    ? ordered.limit(pagination.limit).offset(pagination.offset)
    : ordered;
  const locked = nonNullish(lock) ? paginated.for(lock) : paginated;

  const rows = await locked;
  return rows.map((row) => schema.parse(row));
};

export async function insertMany<T, TTable extends AnyPgTable & { id: AnyPgColumn }>({
  tx,
  table,
  values,
  returningSchema,
}: WriteStatementArgs & {
  values: Omit<InferInsertModel<TTable>, "id" | "createdAt" | "updatedAt" | "version">;
  returningSchema: z.ZodType<T>;
}): Promise<T[]> {
  const rows = await tx.insert(table).values(values).returning();
  return rows.map((row) => returningSchema.parse(row));
}

export async function updateMany<T, TTable extends AnyPgTable & { id: AnyPgColumn }>({
  tx,
  table,
  values,
  returningSchema,
  where,
}: WriteStatementArgs & {
  values: Partial<Omit<InferInsertModel<TTable>, "id" | "createdAt" | "updatedAt">>;
  returningSchema: z.ZodType<T>;
  where: SQL;
}): Promise<T[]> {
  const rows = await tx.update(table).set(values).where(where).returning();
  return rows.map((row) => returningSchema.parse(row));
}

export async function deleteMany<T>({
  tx,
  table,
  returningSchema,
  where,
}: WriteStatementArgs & {
  returningSchema: z.ZodType<T>;
  where: SQL;
}): Promise<T[]> {
  const rows = await tx.delete(table).where(where).returning();
  return rows.map((row) => returningSchema.parse(row));
}

// Locks the key until the end of the transaction, e.g. to serialize the writes of a user.
export const advisoryXactLock = async ({
  tx,
  key,
}: StatementArgs & { key: string }): Promise<void> => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
};
