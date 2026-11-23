import { describe, expect, test } from "bun:test";
import { formatDate, formatRelativeDays } from "../../src/format/date";

describe("formatDate", () => {
  test.each([
    ["de-CH", "01.03.2026"],
    ["en-US", "03/01/2026"],
    ["fr-CH", "01.03.2026"],
  ])("formats the date in %p as %p", (locale, expected) => {
    expect(formatDate({ locale, date: new Date(Date.UTC(2026, 2, 1)) })).toBe(expected);
  });

  test("formats the date in UTC whatever the time of the day", () => {
    expect(formatDate({ locale: "en-US", date: new Date("2026-03-01T23:30:00Z") })).toBe(
      "03/01/2026",
    );
  });
});

describe("formatRelativeDays", () => {
  const now = new Date(2026, 2, 10, 14, 0);

  test.each([
    [new Date(2026, 2, 10, 20, 0), "today"],
    [new Date(2026, 2, 11, 9, 0), "tomorrow"],
    [new Date(2026, 2, 13, 9, 0), "in 3 days"],
    [new Date(2026, 2, 9, 9, 0), "yesterday"],
    [new Date(2026, 2, 7, 20, 0), "3 days ago"],
  ])("formats %p relative to now as %p", (date, expected) => {
    expect(formatRelativeDays({ locale: "en", date, now })).toBe(expected);
  });

  test("counts calendar days rather than periods of 24 hours", () => {
    expect(
      formatRelativeDays({
        locale: "en",
        date: new Date(2026, 2, 11, 1, 0),
        now: new Date(2026, 2, 10, 23, 0),
      }),
    ).toBe("tomorrow");
  });

  test.each([
    ["fr", "dans 3 jours"],
    ["de", "in 3 Tagen"],
    ["it", "tra 3 giorni"],
  ])("formats in %p as %p", (locale, expected) => {
    expect(formatRelativeDays({ locale, date: new Date(2026, 2, 13, 9, 0), now })).toBe(expected);
  });
});
