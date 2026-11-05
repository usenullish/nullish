import * as z from "zod";
import { RecordsSchema } from "../../records";
import { NotEmptyStringSchema } from "@usenullish/nullish-common";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../primitives";

// Postings special cases we need to know their IDs has we pass multiple
// i.e. we cannot use the ID of the record/composite class
const { id: _, ...postingsUpdate } = UPDATE_OMIT_FIELDS;

export const SelectJournalSchema = z.strictObject({
  entry: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema,
  postings: z.array(RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema).min(2),
});

const InsertJournalPostingSchema = RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.omit({
  ...INSERT_OMIT_FIELDS,
  journalEntryId: true,
});

const UpdateJournalPostingSchema = RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.omit({
  ...postingsUpdate,
  journalEntryId: true,
}).required(UPDATE_REQUIRED_FIELDS);

export const InsertJournalSchema = z.strictObject({
  entry: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
    number: true,
    migrated: true,
  }),
  postings: z.array(InsertJournalPostingSchema).min(2),
});

export const UpdateJournalSchema = z.strictObject({
  entry: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    number: true,
    migrated: true,
  }).required(UPDATE_REQUIRED_FIELDS),
  postings: z.array(z.union([UpdateJournalPostingSchema, InsertJournalPostingSchema])).min(2),
});

export const FilterJournalSchema = z.strictObject({
  number:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.number.optional(),
  validOnFrom:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn.optional(),
  validOnTo:
    RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.validOn.optional(),
  reference: NotEmptyStringSchema.optional(),
  accountId: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.accountId.optional(),
});
