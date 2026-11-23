import { formatDate, formatRelativeDays } from "@usenullish/nullish-common";
import { useLocale } from "~/kit/locale/locale.hooks";

export const useFormatDate = (): ((date: Date) => string) => {
  const locale = useLocale();

  return (date) => formatDate({ locale, date });
};

export const useFormatRelativeDays = (): ((args: { date: Date; now: Date }) => string) => {
  const locale = useLocale();

  return ({ date, now }) => formatRelativeDays({ locale, date, now });
};

export const useFormatDateTime = (): ((date: Date) => string) => {
  const locale = useLocale();

  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (date) => format.format(date);
};
