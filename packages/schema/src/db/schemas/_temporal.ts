import * as pg from "drizzle-orm/pg-core";

export const date = () => pg.date({ mode: "date" });

export const timestamp = () => pg.timestamp({ withTimezone: true });

export const timestampNow = () => timestamp().notNull().defaultNow();
