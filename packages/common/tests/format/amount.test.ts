import { describe, expect, test } from "bun:test";
import { formatAmount } from "../../src/format/amount";

describe("formatAmount", () => {
  test.each([
    ["en-US", 123450n, "$1,234.50"],
    ["en-US", 5n, "$0.05"],
    ["en-US", 100n, "$1.00"],
  ])("formats %p %p in USD as %p", (locale, amount, expected) => {
    expect(
      formatAmount({ locale, amount, currency: { code: "USD", decimals: 2, iso: true } }),
    ).toBe(expected);
  });

  test("keeps the sign of a negative amount", () => {
    expect(
      formatAmount({
        locale: "en-US",
        amount: -1250n,
        currency: { code: "USD", decimals: 2, iso: true },
      }),
    ).toBe("-$12.50");
  });

  test("formats an amount without decimals", () => {
    expect(
      formatAmount({
        locale: "en-US",
        amount: 1500n,
        currency: { code: "JPY", decimals: 0, iso: true },
      }),
    ).toBe("¥1,500");
  });

  test("appends the code of a currency that is not ISO 4217", () => {
    expect(
      formatAmount({
        locale: "en-US",
        amount: 150000000n,
        currency: { code: "BTC", decimals: 8, iso: false },
      }),
    ).toBe("1.5 BTC");
  });
});
