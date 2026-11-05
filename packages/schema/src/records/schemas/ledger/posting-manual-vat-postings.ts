import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { PostingManualVatPostingsSchema } from "../../../db/schemas/ledger/posting-manual-vat-postings";
import { INSERT_OMIT_FIELDS } from "../../../primitives";

export const SelectPostingManualVatPostingsSchema = createSelectSchema(
  PostingManualVatPostingsSchema,
);
export const InsertPostingManualVatPostingsSchema = createInsertSchema(
  PostingManualVatPostingsSchema,
).omit(INSERT_OMIT_FIELDS);
