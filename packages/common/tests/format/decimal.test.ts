import { describe, expect, test } from "bun:test";
import { formatDecimal } from "../../src/format/decimal";

describe("formatDecimal", () => {
  test("formats a decimal string in the locale", () => {
    expect(formatDecimal({ locale: "en-US", value: "1234.5", maximumFractionDigits: 3 })).toBe(
      "1,234.5",
    );
  });

  test("drops the trailing zeros", () => {
    expect(formatDecimal({ locale: "en-US", value: "8.100", maximumFractionDigits: 3 })).toBe(
      "8.1",
    );
  });

  test("returns nothing for a value that is not a number", () => {
    expect(
      formatDecimal({ locale: "en-US", value: "abc", maximumFractionDigits: 3 }),
    ).toBeUndefined();
  });
});
