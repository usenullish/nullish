export enum FromStringToTokenError {
  InvalidFormat,
  FractionalTooManyDecimals,
}

/**
 * Receives a string representing a number and returns the big int or error.
 *
 * @param amount - in string format
 * @returns bigint | FromStringToTokenError
 *
 * @see https://github.com/dfinity/icp-js-canisters
 */
export const convertStringToUlps = ({
  amount,
  decimals,
}: {
  amount: string;
  decimals: number;
}): bigint | FromStringToTokenError => {
  // Remove all instances of "," and "'".
  let cleaned = amount.trim().replace(/[,']/g, "");

  // Extract negative sign
  const isNegative = cleaned.startsWith("-");
  if (isNegative) {
    cleaned = cleaned.slice(1);
  }

  // Verify that the string is of the format 1234.5678
  const regexMatch = cleaned.match(/\d*(\.\d*)?/);
  if (!regexMatch || regexMatch[0] !== cleaned || cleaned === "") {
    return FromStringToTokenError.InvalidFormat;
  }

  const [integral, fractional] = cleaned.split(".");

  let ulps = 0n;
  const ulpsPerToken = 10n ** BigInt(decimals);

  if (integral) {
    try {
      ulps += BigInt(integral) * ulpsPerToken;
    } catch {
      return FromStringToTokenError.InvalidFormat;
    }
  }

  if (fractional) {
    if (fractional.length > decimals) {
      return FromStringToTokenError.FractionalTooManyDecimals;
    }
    try {
      ulps += BigInt(fractional.padEnd(decimals, "0"));
    } catch {
      return FromStringToTokenError.InvalidFormat;
    }
  }

  return isNegative ? -ulps : ulps;
};

export const convertUlpsToString = ({
  ulps,
  decimals,
}: {
  ulps: bigint;
  decimals: number;
}): string => {
  const isNegative = ulps < 0n;

  const digits = `${isNegative ? -ulps : ulps}`.padStart(decimals + 1, "0");

  const integral = digits.slice(0, digits.length - decimals);
  const fractional = digits.slice(digits.length - decimals).replace(/0+$/, "");

  const amount = fractional === "" ? integral : `${integral}.${fractional}`;

  return isNegative ? `-${amount}` : amount;
};
