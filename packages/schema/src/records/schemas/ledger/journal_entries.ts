import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { JournalEntriesSchema } from "../../../db/schemas/ledger/journal";
import {
  INSERT_OMIT_FIELDS,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

export const SelectJournalEntriesSchema = createSelectSchema(JournalEntriesSchema);
export const InsertJournalEntriesSchema = createInsertSchema(JournalEntriesSchema).omit({
  ...INSERT_OMIT_FIELDS,
  number: true,
  migrated: true,
});
export const UpdateJournalEntriesSchema = createUpdateSchema(JournalEntriesSchema)
  .omit({
    ...UPDATE_OMIT_FIELDS,
    organizationId: true,
    number: true,
    migrated: true,
  })
  .required(UPDATE_REQUIRED_FIELDS);
