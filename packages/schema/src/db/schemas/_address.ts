import * as pg from "drizzle-orm/pg-core";
import { countryCode } from "./_country";

export const addressFields = () => ({
  careOf: pg.text(),
  address: pg.text(),
  postalCode: pg.text(),
  city: pg.text(),
  country: countryCode(),
});
