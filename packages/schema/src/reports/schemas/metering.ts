import * as z from "zod";
import { RecordsSchema } from "../../records";

const { SelectLlmUsagesSchema } = RecordsSchema.Metering.LlmUsagesSchema;

export const LlmUsageArgsSchema = z.strictObject({
  from: SelectLlmUsagesSchema.shape.loggedAt,
});

export const LlmUsageSchema = SelectLlmUsagesSchema.pick({
  model: true,
  inputTokens: true,
  outputTokens: true,
});

export const LlmUsageResultSchema = z.array(LlmUsageSchema);
