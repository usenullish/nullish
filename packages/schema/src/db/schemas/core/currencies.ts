import * as pg from "drizzle-orm/pg-core";
import { CoreSchema } from "./_schema";
import { auditFields } from "../_audit";
import { CurrencyType } from "../../constants/currencies";

const currencyCode = () => pg.varchar({ length: 20 });

export const currencyType = CoreSchema.enum("currency_type", CurrencyType);

export const CurrenciesSchema = CoreSchema.table("currencies", {
  code: currencyCode().primaryKey(), // ISO 4217 (e.g. CHF, EUR, USD) or ticker for crypto (e.g. ETH, USDC)
  type: currencyType().notNull().default(CurrencyType.FIAT),
  decimals: pg.integer().notNull(),
  ...auditFields(),
});

export const currencyCodeReferenceOptional = () =>
  currencyCode().references(() => CurrenciesSchema.code);

export const currencyCodeReference = () => currencyCodeReferenceOptional().notNull();
