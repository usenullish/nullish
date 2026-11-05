import { describe, expect, test } from "bun:test";
import { toPaymentReference } from "../../../src/banking/_helpers/payment-reference";

describe("toPaymentReference", () => {
  test("reads the payment reference of a QR reference", () => {
    expect(toPaymentReference({ creditorReference: "000000532139565642554536114" })).toBe(
      "53213956564255453611",
    );
  });

  test("reads the payment reference of a QR reference with a prefix from the bank", () => {
    expect(toPaymentReference({ creditorReference: "123456482917365019283746157" })).toBe(
      "48291736501928374615",
    );
  });

  test("reads the payment reference of a creditor reference", () => {
    expect(toPaymentReference({ creditorReference: "RF5648291736501928374615" })).toBe(
      "48291736501928374615",
    );
  });

  test("ignores spaces and letter case", () => {
    expect(toPaymentReference({ creditorReference: "rf56 4829 1736 5019 2837 4615" })).toBe(
      "48291736501928374615",
    );
  });

  test("returns nothing for a reference of another issuer", () => {
    expect(toPaymentReference({ creditorReference: "RF18539007547034" })).toBeUndefined();
  });
});
