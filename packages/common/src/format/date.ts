export const formatDate = ({ locale, date }: { locale: string; date: Date }): string =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const formatRelativeDays = ({
  locale,
  date,
  now,
}: {
  locale: string;
  date: Date;
  now: Date;
}): string =>
  new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS),
    "day",
  );
