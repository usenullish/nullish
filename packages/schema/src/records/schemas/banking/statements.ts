import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { StatementsSchema } from "../../../db/schemas/banking/statements";
import { INSERT_OMIT_FIELDS } from "../../../primitives";

export const SelectStatementsSchema = createSelectSchema(StatementsSchema);
export const InsertStatementsSchema = createInsertSchema(StatementsSchema).omit(INSERT_OMIT_FIELDS);
