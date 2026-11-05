import { type SQL, sql, type SQLWrapper } from "drizzle-orm";
import { CURRENCY_VALUE_PRECISION } from "./constants/currencies";

export const castCurrencyValue = (value: SQLWrapper): SQL<bigint> =>
  sql<bigint>`(${value})::numeric(${sql.raw(`${CURRENCY_VALUE_PRECISION}`)}, 0)`.mapWith(BigInt);

// We store an exchange rate as it is quoted: 1 ETH = 3000 CHF is stored as 3000 and 1 EUR = 0.93 CHF as 0.93.
// An amount, however, is stored in the smallest unit of its currency (wei, cents), which is why converting it
// to the base currency needs the decimals of both currencies:
//
//   amount × rate × 10^(base decimals − currency decimals)
//
// e.g. 1 ETH at 1 ETH = 3000 CHF, in an organization in CHF (2 decimals):
// - stored amount: 1000000000000000000 (ETH has 18 decimals)
// - stored rate: 3000
// - calculation: 1000000000000000000 × 3000 × 10^(2 − 18) = 300000 centimes, i.e. 3000 CHF
//
// e.g. 100 EUR at 1 EUR = 0.93 CHF, in the same organization:
// - stored amount: 10000 (EUR has 2 decimals)
// - stored rate: 0.93
// - calculation: 10000 × 0.93 × 10^(2 − 2) = 9300 centimes, i.e. 93 CHF
//
// The result is rounded once, here.
export const convertToBaseCurrency = ({
  amount,
  exchangeRate,
  decimalsShift,
}: {
  amount: SQLWrapper;
  exchangeRate: SQLWrapper;
  decimalsShift: SQLWrapper;
}): SQL => sql`ROUND(${amount} * ${exchangeRate} * power(10::numeric, ${decimalsShift}))`;
