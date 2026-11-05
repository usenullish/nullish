import * as z from "zod";
import { UpdatePeriodResponseSchema } from "./periods";
import { PeriodCloseMode } from "../../db/constants/periods";

export const ClosePeriodRequestSchema = z.strictObject({
  mode: z.enum(PeriodCloseMode).default(PeriodCloseMode.CLOSING_ENTRIES),
});

export const ClosePeriodResponseSchema = UpdatePeriodResponseSchema;
