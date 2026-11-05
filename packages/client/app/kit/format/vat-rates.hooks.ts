import type { Api } from "@usenullish/nullish-schema/server";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useFormatNumber } from "~/kit/format/number.hooks";

type VatRate = Api["VatRates"]["Client"]["VatRate"];

export const useFormatVatRate = (): ((rate: VatRate) => string) => {
  const { i18n } = useI18n();
  const formatNumber = useFormatNumber();

  return ({ code, type, rate }) =>
    `${code} · ${i18n.vat.type[type]} · ${formatNumber({ value: rate, maximumFractionDigits: 3 })} %`;
};
