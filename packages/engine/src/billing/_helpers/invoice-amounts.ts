import {
  createTokenSchema,
  divideAndRoundToNearest,
  divideAndRoundUp,
} from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import {
  InvoiceLineType,
  QUANTITY_DECIMALS,
  RATE_SCALE_IN_PERCENT,
} from "@usenullish/nullish-schema/db";
import { parseRate } from "../../_utils/vat";

type Line = Records["Billing"]["Lines"]["Select"];
type Lines = Line[];

export interface LinesTotal {
  total: bigint;
  roundingDifference: bigint;
  items: bigint;
  discounts: bigint;
  linesSum: bigint;
}

const QUANTITY_SCALE = 10n ** BigInt(QUANTITY_DECIMALS);

const quantitySchema = createTokenSchema({ decimals: QUANTITY_DECIMALS });

export const computeLinesTotal = ({ lines }: { lines: Lines }): LinesTotal => {
  const computeItemAmount = ({ quantity, unitPrice }: Line): bigint => {
    const parsedQuantity = quantitySchema.parse(`${quantity}`);

    // Per-line amounts are truncated (not rounded) deliberately: rounding
    // each line individually would drift from the true total. The gap is
    // corrected once, at the total level, via roundingDifference below.
    return (parsedQuantity * unitPrice) / QUANTITY_SCALE;
  };

  const computeDiscountAmount = ({ quantity, unitPrice }: Line): bigint => {
    const parsedQuantity = quantitySchema.parse(`${quantity}`);
    return divideAndRoundUp({
      value: parsedQuantity * unitPrice,
      divisor: QUANTITY_SCALE,
    });
  };

  const sumLines = (lines: Lines): bigint =>
    lines.reduce(
      (sum, line) => sum + quantitySchema.parse(`${line.quantity}`) * line.unitPrice,
      0n,
    );

  const items = sumLines(lines.filter(({ type }) => type === InvoiceLineType.ITEM));
  const discounts = sumLines(lines.filter(({ type }) => type === InvoiceLineType.DISCOUNT));

  const total = divideAndRoundToNearest({
    value: items - discounts,
    divisor: QUANTITY_SCALE,
  });

  const linesSum = lines.reduce(
    (sum, line) =>
      sum +
      (line.type === InvoiceLineType.ITEM
        ? computeItemAmount(line)
        : -1n * computeDiscountAmount(line)),
    0n,
  );

  return {
    total,
    roundingDifference: total - linesSum,
    items,
    discounts,
    linesSum,
  };
};

export const computeVat = ({ amount, rate }: { amount: bigint; rate: number }): bigint =>
  divideAndRoundToNearest({
    value: amount * parseRate(rate),
    divisor: RATE_SCALE_IN_PERCENT,
  });
