import * as pg from "drizzle-orm/pg-core";
import { languageCode } from "./_language";

export const communicationFields = () => ({
  language: languageCode(),
  email: pg.text(),
  phone: pg.text(),
  website: pg.text(),
});
