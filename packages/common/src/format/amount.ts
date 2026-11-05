import type { Option } from "../option";
import { convertUlpsToString } from "../utils/token";
import { NumericStringSchema } from "./_numeric";

export const formatAmount = ({
  locale,
  amount,
  currency: { code, decimals, iso },
}: {
  locale: string;
  amount: bigint;
  currency: { code: string; decimals: number; iso: boolean };
}): Option<string> => {
  const { success, data: value } = NumericStringSchema.safeParse(
    convertUlpsToString({ ulps: amount, decimals }),
  );

  if (!success) {
    return undefined;
  }

  // Intl only formats the ISO 4217 currencies
  if (!iso) {
    const parsedValue = new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
    }).format(value);

    return `${parsedValue} ${code}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
