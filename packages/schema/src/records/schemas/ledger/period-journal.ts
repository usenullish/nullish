import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { PeriodJournalEntriesSchema } from "../../../db/schemas/ledger/period-journal";
import { INSERT_OMIT_FIELDS } from "../../../primitives";
import { PeriodJournalEntryType } from "../../../db";
import * as z from "zod";

// Drizzle does not correctly infer the enum
const refinePeriodJournalEntryTypeEnums = {
  type: z.enum(PeriodJournalEntryType),
};

export const SelectPeriodJournalEntriesSchema = createSelectSchema(
  PeriodJournalEntriesSchema,
  refinePeriodJournalEntryTypeEnums,
);
export const InsertPeriodJournalEntriesSchema = createInsertSchema(
  PeriodJournalEntriesSchema,
  refinePeriodJournalEntryTypeEnums,
).omit(INSERT_OMIT_FIELDS);
