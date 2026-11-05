import * as z from "zod";
import { ServicesSchema } from "../../services";
import { BANK_STATEMENT_FILE_MAX_SIZE } from "../constants/banking";

export const ImportStatementsRequestSchema = z.strictObject({
  file: z.file().max(BANK_STATEMENT_FILE_MAX_SIZE).meta({ type: "string", format: "binary" }),
});

export const ImportStatementsResponseSchema =
  ServicesSchema.BankingSchema.ImportStatementsResultSchema;
