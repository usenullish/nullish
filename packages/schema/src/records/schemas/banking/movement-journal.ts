import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { MovementJournalEntriesSchema } from "../../../db/schemas/banking/movement-journal";
import { INSERT_OMIT_FIELDS } from "../../../primitives";

export const SelectMovementJournalEntriesSchema = createSelectSchema(MovementJournalEntriesSchema);
export const InsertMovementJournalEntriesSchema = createInsertSchema(
  MovementJournalEntriesSchema,
).omit(INSERT_OMIT_FIELDS);
