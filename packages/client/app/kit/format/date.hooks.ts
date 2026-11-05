import { formatDate } from "@usenullish/nullish-common";
import { useLocale } from "~/kit/locale/locale.hooks";

export const useFormatDate = (): ((date: Date) => string) => {
  const locale = useLocale();

  return (date) => formatDate({ locale, date });
};

export const useFormatDateTime = (): ((date: Date) => string) => {
  const locale = useLocale();

  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (date) => format.format(date);
};
