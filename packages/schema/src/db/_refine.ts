import * as z from "zod";

export const refineCurrencyValue = z.bigint();

export const refineExchangeRate = z
  .number()
  .describe(
    "Exchange rate to the base currency of the organization: what one unit of the currency is worth in the base currency, as usually quoted (e.g. 0.93 for 1 EUR = 0.93 CHF). It must be 1 when the currency is the base currency.",
  );
