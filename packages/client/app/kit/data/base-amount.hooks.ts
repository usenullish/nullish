import {
  convertStringToUlps,
  divideAndRoundToNearest,
  isNullish,
  type Option,
} from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { EXCHANGE_RATE_DECIMALS } from "@usenullish/nullish-schema/db";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useCurrencyDecimals } from "~/kit/data/currencies.hooks";

type Currency = Api["Currencies"]["Client"]["Currency"];

const EXCHANGE_RATE_SCALE = 10n ** BigInt(EXCHANGE_RATE_DECIMALS);

export const useBaseAmount = (): ((args: {
  amount: bigint;
  currency: Option<Currency["code"]>;
  exchangeRate: string;
}) => Option<bigint>) => {
  const accountingSettings = useAccountingSettings();
  const decimalsOf = useCurrencyDecimals();

  return ({ amount, currency, exchangeRate }) => {
    const baseCurrency = accountingSettings?.baseCurrency;
    const decimals = decimalsOf(currency);
    const baseDecimals = decimalsOf(baseCurrency);

    if (isNullish(decimals) || isNullish(baseDecimals)) {
      return undefined;
    }

    if (currency === baseCurrency) {
      return amount;
    }

    const rate = convertStringToUlps({ amount: exchangeRate, decimals: EXCHANGE_RATE_DECIMALS });

    if (typeof rate !== "bigint") {
      return undefined;
    }

    const shift = baseDecimals - decimals;

    return shift < 0
      ? divideAndRoundToNearest({
          value: amount * rate,
          divisor: EXCHANGE_RATE_SCALE * 10n ** BigInt(-shift),
        })
      : divideAndRoundToNearest({
          value: amount * rate * 10n ** BigInt(shift),
          divisor: EXCHANGE_RATE_SCALE,
        });
  };
};
