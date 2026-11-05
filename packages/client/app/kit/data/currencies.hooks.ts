import { useMemo } from "react";
import { nonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { CurrencyType } from "@usenullish/nullish-schema/db";
import { useCurrencies } from "~/context/contexts/currencies.context";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import cryptoNames from "~/assets/currencies/crypto.json";
import * as z from "zod";

type Currency = Api["Currencies"]["Client"]["Currency"];

const CRYPTO_NAMES = z.record(z.string(), z.string()).parse(cryptoNames);

export interface CurrencyUi {
  currency: Currency;
  label: string;
}

const fiatName = ({ code, names }: { code: Currency["code"]; names: Intl.DisplayNames }) => {
  try {
    const name = names.of(code);

    return name === code ? undefined : name;
  } catch {
    return undefined;
  }
};

export const useCurrenciesUi = (): {
  currencies: CurrencyUi[];
  matches: (params: { currencyUi: CurrencyUi; query: string }) => boolean;
} => {
  const { i18n } = useI18n();
  const currencies = useCurrencies();
  const accountingSettings = useAccountingSettings();

  const baseCurrency = accountingSettings?.baseCurrency;

  const currenciesUi = useMemo(() => {
    const names = new Intl.DisplayNames(i18n.lang, { type: "currency" });

    const nameOf = ({ code, type }: Currency): Option<string> =>
      type === CurrencyType.CRYPTO ? CRYPTO_NAMES[code] : fiatName({ code, names });

    return (currencies ?? [])
      .map((currency) => {
        const name = nameOf(currency);

        return {
          currency,
          label: nonNullish(name) ? `${currency.code} · ${name}` : currency.code,
        };
      })
      .toSorted((a, b) => {
        if (a.currency.code === baseCurrency) {
          return -1;
        }

        if (b.currency.code === baseCurrency) {
          return 1;
        }

        return a.currency.code.localeCompare(b.currency.code);
      });
  }, [currencies, baseCurrency, i18n.lang]);

  const matches = ({ currencyUi: { label }, query }: { currencyUi: CurrencyUi; query: string }) =>
    label.toLowerCase().includes(query.trim().toLowerCase());

  return { currencies: currenciesUi, matches };
};

export const useCurrencyDecimals = (): ((
  code: Option<Currency["code"]>,
) => Option<Currency["decimals"]>) => {
  const currencies = useCurrencies();

  return (code) => currencies?.find((currency) => currency.code === code)?.decimals;
};
