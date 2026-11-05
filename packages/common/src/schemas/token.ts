import * as z from "zod";
import { convertStringToUlps, FromStringToTokenError } from "../utils/token";

export const createTokenSchema = ({ decimals }: { decimals: number }) =>
  z.string().transform((val, ctx) => {
    const result = convertStringToUlps({ amount: val, decimals });

    if (result === FromStringToTokenError.InvalidFormat) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid amount format (e.g., 1234.56).",
      });
      return z.NEVER;
    }

    if (result === FromStringToTokenError.FractionalTooManyDecimals) {
      ctx.addIssue({
        code: "custom",
        message: `Amount has too many decimal places (maximum is ${decimals}).`,
      });
      return z.NEVER;
    }

    return result;
  });
