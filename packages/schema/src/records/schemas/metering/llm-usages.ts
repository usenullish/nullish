import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { LlmUsagesSchema } from "../../../db/schemas/metering/llm-usages";

export const SelectLlmUsagesSchema = createSelectSchema(LlmUsagesSchema);
export const InsertLlmUsagesSchema = createInsertSchema(LlmUsagesSchema).omit({
  id: true,
  loggedAt: true,
});
