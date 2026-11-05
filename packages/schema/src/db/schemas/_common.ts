import * as pg from "drizzle-orm/pg-core";

export const primaryKey = () => pg.uuid().primaryKey().defaultRandom();

export const numeric = ({ precision, scale = 3 }: { precision: number; scale?: number }) =>
  pg.numeric({ precision, scale, mode: "number" });
