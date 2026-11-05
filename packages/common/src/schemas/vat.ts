import * as z from "zod";

export const VAT_NUMBER_REGEX = /^CHE-\d{3}\.\d{3}\.\d{3} (MWST|TVA|IVA)$/;

export const VatNumberSchema = z
  .string()
  .regex(VAT_NUMBER_REGEX, "Invalid Swiss VAT number format");
