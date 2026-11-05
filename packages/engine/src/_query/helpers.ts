import { asc, desc, getColumns, ilike, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable, PgView } from "drizzle-orm/pg-core";
import type { SelectManyFilterArgs } from "@usenullish/nullish-db";
import { type QueryArgs, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { isNullish, type Option } from "@usenullish/nullish-common";
import type { DbRecordsFilters } from "../_records/records";

export const parseQueryArgs = <TField extends string>({
  args,
  schema,
  table,
  pKey,
}: {
  args: QueryArgs<TField>;
  schema: ReturnType<typeof queryArgsSchema<[TField, ...TField[]]>>;
  table: AnyPgTable | PgView;
  pKey: AnyPgColumn;
}): Required<SelectManyFilterArgs> => {
  const { pagination, sort } = schema.parse(args);

  // Notably useful in case e.g. two updated_at or created_at are identical
  const orderPKey = desc(pKey);

  const { field: sortField, direction: sortDirection } = sort;

  // TODO: can we avoid casting?
  const column = getColumns(table)[sortField] as AnyPgColumn;
  const direction = sortDirection === "asc" ? asc : desc;

  return { pagination, orderBy: [direction(column), orderPKey] };
};

export const parseFilters = <TFilters>(
  filters: Option<DbRecordsFilters<TFilters>>,
): { where: Option<SQL> } => {
  if (isNullish(filters?.values)) {
    return { where: undefined };
  }

  const { values, schema, where } = filters;

  return { where: where(schema.parse(values)) };
};

export const ilikeContains = ({ column, value }: { column: AnyPgColumn; value: string }): SQL =>
  ilike(column, `%${value.replace(/[\\%_]/g, "\\$&")}%`);
