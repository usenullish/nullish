import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { LlmReservationsSchema } from "../../../db/schemas/metering/llm-reservations";

export const SelectLlmReservationsSchema = createSelectSchema(LlmReservationsSchema);
export const InsertLlmReservationsSchema = createInsertSchema(LlmReservationsSchema).omit({
  id: true,
});
