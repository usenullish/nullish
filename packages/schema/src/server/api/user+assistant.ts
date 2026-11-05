import * as z from "zod";
import { ReportsSchema } from "../../reports";

export const AssistantModelSchema = z.strictObject({
  model: ReportsSchema.MeteringSchema.LlmUsageSchema.shape.model,
});

export const AssistantSchema = z.strictObject({
  models: z.array(AssistantModelSchema).nonempty().nullable(),
});

export const GetAssistantResponseSchema = z.strictObject({
  assistant: AssistantSchema,
});
