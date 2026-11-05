import * as pg from "drizzle-orm/pg-core";

// ISO 3166-1 alpha-2
export const countryCode = () => pg.varchar({ length: 2 });
