import type { Option } from "../option";
import { NumericStringSchema } from "./_numeric";

export const formatDecimal = ({
  locale,
  value,
  maximumFractionDigits,
}: {
  locale: string;
  value: string;
  maximumFractionDigits: number;
}): Option<string> => {
  const { success, data } = NumericStringSchema.safeParse(value);

  if (!success) {
    return undefined;
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(data);
};
