import * as pg from "drizzle-orm/pg-core";
import { type ColumnType, sql } from "drizzle-orm";
import { ExtraConfigColumn, type PgColumnBaseConfig } from "drizzle-orm/pg-core";

export const vatNumber = () => pg.text();

export const vatNumberChecks = ({
  tableName,
  column,
}: {
  tableName: string;
  column: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
}) => [
  pg.check(
    `${tableName}_vat_number_format`,
    sql`${column} ~ '^CHE-\\d{3}\\.\\d{3}\\.\\d{3} (MWST|TVA|IVA)$'`,
  ),
];
