import { describe, expect, test } from "bun:test";
import { InvoiceLineType } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { computeLinesTotal, computeVat } from "../../../src/billing/_helpers/invoice-amounts";

type Line = Records["Billing"]["Lines"]["Select"];

const line = ({
  type = InvoiceLineType.ITEM,
  quantity = 1,
  unitPrice = 1000n,
}: {
  type?: InvoiceLineType;
  quantity?: number;
  unitPrice?: bigint;
}): Line => ({
  id: "11111111-1111-4111-8111-111111111111",
  type,
  description: "Line",
  quantity,
  unitPrice,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
});

describe("computeLinesTotal", () => {
  test("sums the item lines", () => {
    const { total, roundingDifference } = computeLinesTotal({
      lines: [line({ unitPrice: 1000n }), line({ quantity: 2, unitPrice: 250n })],
    });

    expect(total).toBe(1500n);
    expect(roundingDifference).toBe(0n);
  });

  test("subtracts the discount lines", () => {
    const { total } = computeLinesTotal({
      lines: [
        line({ unitPrice: 1000n }),
        line({ type: InvoiceLineType.DISCOUNT, unitPrice: 100n }),
      ],
    });

    expect(total).toBe(900n);
  });

  test("rounds the total and keeps the truncated lines difference apart", () => {
    const { total, roundingDifference, linesSum } = computeLinesTotal({
      lines: [line({ quantity: 1.5, unitPrice: 333n })],
    });

    expect(total).toBe(500n);
    expect(linesSum).toBe(499n);
    expect(roundingDifference).toBe(1n);
  });

  test("returns a negative total when the discounts exceed the items", () => {
    const { total } = computeLinesTotal({
      lines: [
        line({ unitPrice: 500n }),
        line({ type: InvoiceLineType.DISCOUNT, unitPrice: 1000n }),
      ],
    });

    expect(total).toBe(-500n);
  });

  test("returns zero without lines", () => {
    const { total, roundingDifference } = computeLinesTotal({ lines: [] });

    expect(total).toBe(0n);
    expect(roundingDifference).toBe(0n);
  });
});

describe("computeVat", () => {
  test("applies the rate in percent and rounds to the nearest unit", () => {
    expect(computeVat({ amount: 20500n, rate: 8.1 })).toBe(1661n);
  });

  test("returns zero for a zero amount", () => {
    expect(computeVat({ amount: 0n, rate: 8.1 })).toBe(0n);
  });
});
