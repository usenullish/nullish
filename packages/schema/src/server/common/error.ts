import * as z from "zod";
import { ErrorCode } from "../constants/errors";

export const ErrorCodeSchema = z.enum(ErrorCode);

export const ErrorSchema = z.strictObject({
  error: z.string(),
  code: ErrorCodeSchema,
});
