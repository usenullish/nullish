import { describe, expect, test } from "bun:test";
import { convertStringToUlps, convertUlpsToString } from "../../src/utils/token";

describe("convertUlpsToString", () => {
  test.each([
    [150000000n, 8, "1.5"],
    [1234567890123456789n, 18, "1.234567890123456789"],
    [5n, 18, "0.000000000000000005"],
    [1234n, 2, "12.34"],
    [1200n, 2, "12"],
    [1230n, 2, "12.3"],
    [1234n, 0, "1234"],
    [0n, 2, "0"],
    [0n, 0, "0"],
  ])("formats %p with %i decimals as %p", (ulps, decimals, expected) => {
    expect(convertUlpsToString({ ulps, decimals })).toBe(expected);
  });

  test.each([
    [-12345n, 2, "-123.45"],
    [-5n, 2, "-0.05"],
    [-1200n, 2, "-12"],
  ])("keeps the sign of %p with %i decimals as %p", (ulps, decimals, expected) => {
    expect(convertUlpsToString({ ulps, decimals })).toBe(expected);
  });

  test("formats a value beyond 64 bits without losing a digit", () => {
    expect(convertUlpsToString({ ulps: 10n ** 24n + 1n, decimals: 24 })).toBe(
      "1.000000000000000000000001",
    );
  });

  test.each([
    [150000000n, 8],
    [1234567890123456789n, 18],
    [-12345n, 2],
    [1234n, 0],
    [10n ** 24n + 1n, 24],
  ])("is reversed by convertStringToUlps for %p with %i decimals", (ulps, decimals) => {
    const amount = convertUlpsToString({ ulps, decimals });

    expect(convertStringToUlps({ amount, decimals })).toBe(ulps);
  });
});
