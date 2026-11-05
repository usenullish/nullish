import * as pg from "drizzle-orm/pg-core";

// ISO 639-1
export const languageCode = () => pg.varchar({ length: 2 });
