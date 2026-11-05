import {
  assertArrayAtLeastOne,
  assertArrayAtMostOne,
  assertArrayExactlyOne,
  isArrayEmpty,
  isNullish,
  nonNullish,
  notEmptyString,
  type Option,
} from "@usenullish/nullish-common";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { selectMany } from "@usenullish/nullish-db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, gte, inArray, lte, notInArray, sql, type SQL } from "drizzle-orm";
import { EngineError } from "../../errors";
import { ilikeContains } from "../../_query/helpers";

type SelectRecordJournal = Records["Ledger"]["JournalEntries"]["Select"];

type SelectCompositesJournal = Composites["Journal"]["Select"];
type InsertCompositesJournal = Composites["Journal"]["Insert"];
type UpdateCompositesJournal = Composites["Journal"]["Update"];
type FilterCompositesJournal = Composites["Journal"]["Filter"];
type UpdateCompositesJournalPosting = UpdateCompositesJournal["postings"][number];
type UpdatedCompositesJournalPosting = Extract<UpdateCompositesJournalPosting, { id: unknown }>;
type NewCompositesJournalPosting = Exclude<UpdateCompositesJournalPosting, { id: unknown }>;

type SelectRecordPosting = Records["Ledger"]["Postings"]["Select"];
type SelectRecordPostings = SelectRecordPosting[];

class InsertJournalError extends EngineError {}
class InsertJournalEntryError extends InsertJournalError {}
class InsertPostingError extends InsertJournalError {}

const buildJournalWhere = ({
  number: journalNumber,
  validOnFrom,
  validOnTo,
  reference,
  accountId,
}: FilterCompositesJournal): Option<SQL> => {
  const entries = DbSchema.Ledger.Journal.JournalEntriesSchema;
  const postings = DbSchema.Ledger.Journal.PostingsSchema;

  return and(
    nonNullish(journalNumber) ? eq(entries.number, journalNumber) : undefined,
    nonNullish(validOnFrom) ? gte(entries.validOn, validOnFrom) : undefined,
    nonNullish(validOnTo) ? lte(entries.validOn, validOnTo) : undefined,
    notEmptyString(reference)
      ? ilikeContains({ column: entries.reference, value: reference })
      : undefined,
    nonNullish(accountId)
      ? sql`${entries.id} IN (SELECT ${postings.journalEntryId} FROM ${postings} WHERE ${postings.accountId} = ${accountId})`
      : undefined,
  );
};

export const findJournalById = async ({
  tx,
  id,
}: {
  tx: Tx;
  id: SelectRecordJournal["id"];
}): Promise<Option<SelectCompositesJournal>> => {
  const entries = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.JournalEntriesSchema,
    schema: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema,
    where: eq(DbSchema.Ledger.Journal.JournalEntriesSchema.id, id),
  });

  assertArrayAtMostOne(entries);

  const [entry] = entries;

  if (isNullish(entry)) {
    return undefined;
  }

  const postings = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.PostingsSchema,
    schema: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema,
    where: eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, entry.id),
  });

  return CompositesSchema.JournalSchema.SelectJournalSchema.parse({ entry, postings });
};

export const listJournals = async ({
  tx,
  organizationId,
  filters,
  ...queryArgs
}: {
  tx: Tx;
  organizationId: SelectRecordJournal["organizationId"];
  filters: Option<FilterCompositesJournal>;
} & Required<SelectManyFilterArgs>): Promise<SelectCompositesJournal[]> => {
  const entries = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.JournalEntriesSchema,
    schema: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema,
    where: and(
      eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId),
      isNullish(filters) ? undefined : buildJournalWhere(filters),
    ),
    ...queryArgs,
  });

  if (isArrayEmpty(entries)) {
    return [];
  }

  const postings = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.PostingsSchema,
    schema: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema,
    where: inArray(
      DbSchema.Ledger.Journal.PostingsSchema.journalEntryId,
      entries.map(({ id }) => id),
    ),
  });

  return entries.map((entry) =>
    CompositesSchema.JournalSchema.SelectJournalSchema.parse({
      entry,
      postings: postings.filter(({ journalEntryId }) => journalEntryId === entry.id),
    }),
  );
};

export const insertJournal = async ({
  tx,
  values: { postings, entry },
}: {
  tx: Tx;
  values: {
    entry: InsertCompositesJournal["entry"] & {
      organizationId: SelectCompositesJournal["entry"]["organizationId"];
    };
    postings: Omit<Records["Ledger"]["Postings"]["Insert"], "journalEntryId">[];
  };
}): Promise<SelectCompositesJournal> => {
  const [txEntry] = await tx
    .insert(DbSchema.Ledger.Journal.JournalEntriesSchema)
    .values(entry)
    .returning();

  if (isNullish(txEntry)) {
    tx.rollback();
    // TypeScript does not infer rollback returns never
    throw new InsertJournalEntryError();
  }

  const txPostings = await tx
    .insert(DbSchema.Ledger.Journal.PostingsSchema)
    .values(
      postings.map((posting) => ({
        ...posting,
        organizationId: txEntry.organizationId,
        journalEntryId: txEntry.id,
      })),
    )
    .returning();

  if (isNullish(txPostings)) {
    tx.rollback();
    // TypeScript does not infer rollback returns never
    throw new InsertPostingError();
  }

  return CompositesSchema.JournalSchema.SelectJournalSchema.parse({
    entry: txEntry,
    postings: txPostings,
  });
};

export const updateJournal = async ({
  tx,
  journalId,
  values: { entry, postings },
}: {
  tx: Tx;
  journalId: SelectRecordJournal["id"];
  values: UpdateCompositesJournal;
}): Promise<SelectCompositesJournal> => {
  const entries = await tx
    .update(DbSchema.Ledger.Journal.JournalEntriesSchema)
    .set(entry)
    .where(eq(DbSchema.Ledger.Journal.JournalEntriesSchema.id, journalId))
    .returning();

  assertArrayExactlyOne(entries);

  const [txEntry] = entries;

  const deletePostings = async () => {
    const keptPostingIds = postings.flatMap((posting) => ("id" in posting ? [posting.id] : []));

    await tx
      .delete(DbSchema.Ledger.Journal.PostingsSchema)
      .where(
        and(
          eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalId),
          isArrayEmpty(keptPostingIds)
            ? undefined
            : notInArray(DbSchema.Ledger.Journal.PostingsSchema.id, keptPostingIds),
        ),
      );
  };

  const updatePosting = async ({
    id: postingId,
    ...postingValues
  }: UpdatedCompositesJournalPosting) => {
    const results = await tx
      .update(DbSchema.Ledger.Journal.PostingsSchema)
      .set(postingValues)
      .where(
        and(
          eq(DbSchema.Ledger.Journal.PostingsSchema.id, postingId),
          eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalId),
        ),
      )
      .returning();

    assertArrayExactlyOne(results);

    const [updated] = results;
    return updated;
  };

  const insertPosting = async (posting: NewCompositesJournalPosting) => {
    const results = await tx
      .insert(DbSchema.Ledger.Journal.PostingsSchema)
      .values({ ...posting, organizationId: txEntry.organizationId, journalEntryId: journalId })
      .returning();

    assertArrayExactlyOne(results);

    const [inserted] = results;
    return inserted;
  };

  const updatePostings = async () => {
    const updatedPostings = postings.flatMap((posting) => ("id" in posting ? [posting] : []));

    return await Promise.all(updatedPostings.map(updatePosting));
  };

  const insertPostings = async () => {
    const newPostings = postings.flatMap((posting) => ("id" in posting ? [] : [posting]));

    return await Promise.all(newPostings.map(insertPosting));
  };

  await deletePostings();

  const [updatedPostings, insertedPostings] = await Promise.all([
    updatePostings(),
    insertPostings(),
  ]);

  return CompositesSchema.JournalSchema.SelectJournalSchema.parse({
    entry: txEntry,
    postings: [...updatedPostings, ...insertedPostings],
  });
};

export const deleteJournal = async ({
  tx,
  journalId,
}: {
  tx: Tx;
  journalId: SelectRecordJournal["id"];
}): Promise<Option<SelectCompositesJournal>> => {
  const [exist] = await tx
    .select({ id: DbSchema.Ledger.Journal.JournalEntriesSchema.id })
    .from(DbSchema.Ledger.Journal.JournalEntriesSchema)
    .where(eq(DbSchema.Ledger.Journal.JournalEntriesSchema.id, journalId));

  if (isNullish(exist)) {
    return undefined;
  }

  const postings = await tx
    .delete(DbSchema.Ledger.Journal.PostingsSchema)
    .where(eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalId))
    .returning();

  const entries = await tx
    .delete(DbSchema.Ledger.Journal.JournalEntriesSchema)
    .where(eq(DbSchema.Ledger.Journal.JournalEntriesSchema.id, journalId))
    .returning();

  assertArrayExactlyOne(entries);

  const [entry] = entries;

  return CompositesSchema.JournalSchema.SelectJournalSchema.parse({ entry, postings });
};

export const getJournalEntry = async ({
  tx,
  journalId,
}: {
  tx: Tx;
  journalId: SelectRecordJournal["id"];
}): Promise<SelectRecordJournal> => {
  const entries = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.JournalEntriesSchema,
    schema: RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema,
    where: eq(DbSchema.Ledger.Journal.JournalEntriesSchema.id, journalId),
  });

  assertArrayExactlyOne(entries);

  const [journal] = entries;
  return journal;
};

export const listPostings = async ({
  tx,
  journalId,
}: {
  tx: Tx;
  journalId: SelectRecordPosting["journalEntryId"];
}): Promise<SelectRecordPostings> => {
  const postings = await selectMany({
    tx,
    table: DbSchema.Ledger.Journal.PostingsSchema,
    schema: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema,
    where: eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalId),
  });

  assertArrayAtLeastOne(postings);

  return postings;
};
