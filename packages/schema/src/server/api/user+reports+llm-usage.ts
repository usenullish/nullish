import * as z from "zod";
import { BigIntCodec } from "@usenullish/nullish-common";
import { ReportsSchema } from "../../reports";

export const LlmUsageSchema = ReportsSchema.MeteringSchema.LlmUsageSchema.extend({
  inputTokens: BigIntCodec,
  outputTokens: BigIntCodec,
});

export const GetLlmUsageResponseSchema = z.strictObject({
  llmUsage: z.array(LlmUsageSchema),
});
