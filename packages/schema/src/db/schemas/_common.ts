import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const primaryKey = () => pg.uuid().primaryKey().defaultRandom();

export const singleRowPrimaryKey = () => pg.integer().primaryKey().default(1);

export const singleRowRules = ({
  tableName,
  table: { id },
}: {
  tableName: string;
  table: { id: pg.AnyPgColumn };
}) => [pg.check(`${tableName}_single_row`, sql`${id} = 1`)];

export const numeric = ({ precision, scale = 3 }: { precision: number; scale?: number }) =>
  pg.numeric({ precision, scale, mode: "number" });
