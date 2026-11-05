/**
 * Rounds to the nearest whole unit; exact ties round up.
 * @example divideAndRoundToNearest({ value: 201n, decimalScale: 100n }) // 201/100 = 2.01 → 2n
 */
export const divideAndRoundToNearest = ({
  value,
  divisor,
}: {
  value: bigint;
  divisor: bigint;
}): bigint => {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
};

/**
 * Rounds up to the next whole unit whenever there's any remainder (ceiling division).
 * @example divideAndRoundUp({ value: 201n, decimalScale: 100n }) // 201/100 = 2.01 → 3n
 */
export const divideAndRoundUp = ({
  value,
  divisor,
}: {
  value: bigint;
  divisor: bigint;
}): bigint => {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder > 0n ? quotient + 1n : quotient;
};
