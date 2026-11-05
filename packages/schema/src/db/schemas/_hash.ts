import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const hash = () => pg.char({ length: 64 });

export const checkHashFormat = ({ name, column }: { name: string; column: pg.AnyPgColumn }) =>
  pg.check(name, sql`${column} ~ '^[0-9a-f]{64}$'`);
