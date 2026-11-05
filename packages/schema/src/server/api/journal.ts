import { RecordsSchema } from "../../records";
import { CompositesSchema } from "../../composites";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { BigIntCodec, DateCodec, DateStringCodec } from "@usenullish/nullish-common";

const withDebitCreditCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    debit: BigIntCodec,
    credit: BigIntCodec,
  });

const withValidCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    validOn: DateCodec,
  });

export const PostingResponseSchema = z.strictObject({
  entry: withValidCodecs(
    withAuditFieldsCodecs(RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema),
  ),
  postings: z
    .array(
      withAuditFieldsCodecs(
        withDebitCreditCodecs(RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema),
      ),
    )
    .min(2),
});
export const GetJournalEntriesResponseSchema = z.strictObject({
  journalEntries: z.array(PostingResponseSchema),
});
export const GetJournalEntryResponseSchema = z.strictObject({
  journalEntry: PostingResponseSchema.nullish(),
});
export const CreateJournalEntryResponseSchema = z.strictObject({
  journalEntry: PostingResponseSchema,
});
export const UpdateJournalEntryResponseSchema = CreateJournalEntryResponseSchema;

export const GetJournalEntriesRequestSchema = z.strictObject({
  ...CompositesSchema.JournalSchema.SelectJournalSchema.shape,
  entry: withValidCodecs(RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema),
});

export const CreateJournalEntryRequestSchema = z.strictObject({
  entry: withValidCodecs(CompositesSchema.JournalSchema.InsertJournalSchema.shape.entry),
  postings: z
    .array(
      withDebitCreditCodecs(
        RecordsSchema.Ledger.PostingsSchema.InsertPostingsSchema.omit({
          journalEntryId: true,
        }),
      ),
    )
    .min(2),
});

const [UpdatePostingSchema, NewPostingSchema] =
  CompositesSchema.JournalSchema.UpdateJournalSchema.shape.postings.element.options;

export const UpdateJournalEntryRequestSchema = z.strictObject({
  entry: withValidCodecs(CompositesSchema.JournalSchema.UpdateJournalSchema.shape.entry),
  postings: z
    .array(
      z.union([
        withDebitCreditCodecs(UpdatePostingSchema),
        withDebitCreditCodecs(NewPostingSchema),
      ]),
    )
    .min(2),
});

export const GetJournalEntriesFiltersSchema =
  CompositesSchema.JournalSchema.FilterJournalSchema.extend({
    validOnFrom: DateCodec.optional(),
    validOnTo: DateCodec.optional(),
  });
export const GetJournalEntriesFiltersQuerySchema =
  CompositesSchema.JournalSchema.FilterJournalSchema.extend({
    number: z.coerce
      .number()
      .pipe(RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema.shape.number)
      .optional(),
    validOnFrom: DateStringCodec.optional(),
    validOnTo: DateStringCodec.optional(),
  });
