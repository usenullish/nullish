import { useLocale } from "~/kit/locale/locale.hooks";
import type { Api } from "@usenullish/nullish-schema/server";
import { CurrencyType } from "@usenullish/nullish-schema/db";
import { formatAmount, type Option } from "@usenullish/nullish-common";

type Currency = Api["Currencies"]["Client"]["GetCurrenciesResponse"]["currencies"][0];

export const useFormatAmount = (): ((args: {
  currency: Currency;
  amount: bigint;
}) => Option<string>) => {
  const locale = useLocale();

  return ({ currency: { code, decimals, type }, amount }) =>
    formatAmount({
      locale,
      amount,
      currency: { code, decimals, iso: type !== CurrencyType.CRYPTO },
    });
};
