import { describe, expect, test } from "bun:test";
import { formatDate } from "../../src/format/date";

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
