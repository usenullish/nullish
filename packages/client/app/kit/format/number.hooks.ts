import { useLocale } from "~/kit/locale/locale.hooks";

export const useFormatNumber = (): ((args: {
  value: number | bigint;
  maximumFractionDigits?: number;
}) => string) => {
  const locale = useLocale();

  return ({ value, maximumFractionDigits }) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
};
