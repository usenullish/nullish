import * as pg from "drizzle-orm/pg-core";
import { CURRENCY_VALUE_PRECISION } from "../constants/currencies";

// We use numeric and not a (Postgres !== JavaScript) bigint because the latter is an integer capped to 8 bytes,
// which would limit an amount to roughly 9.2 ETH given the need of 18 decimals.
// numeric(78, 0) is often used in blockchain to support e.g. uint256
export const currencyValue = () =>
  pg.numeric({ precision: CURRENCY_VALUE_PRECISION, scale: 0, mode: "bigint" });
