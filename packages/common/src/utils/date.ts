/**
 * Formats a date as a plain `YYYY-MM-DD` string in the local time zone.
 *
 * Unlike `date.toISOString().slice(0, 10)`, which uses UTC, the result is the calendar day the user
 * sees: shortly after midnight in Switzerland, UTC is still on the previous day.
 *
 * The `en-CA` locale is used because it formats dates as year-month-day.
 *
 * @example toLocalDateString(new Date(2026, 2, 1)) // "2026-03-01"
 */
export const toLocalDateString = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA").format(date);
