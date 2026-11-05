import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { eq, inArray } from "drizzle-orm";

type Journal = Composites["Journal"]["Select"];
type JournalSummary = Composites["JournalSummaries"]["Select"];

export const loadJournalSummaries = async ({
  tx,
  journals,
}: {
  tx: Tx;
  journals: [Journal, ...Journal[]];
}): Promise<JournalSummary[]> => {
  const invoiceJournalTable = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
  const periodJournalTable = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;
  const movementJournalTable = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;
  const movementsTable = DbSchema.Banking.Movements.MovementsSchema;
  const postingManualVatPostingsTable =
    DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;
  const postingsTable = DbSchema.Ledger.Journal.PostingsSchema;

  const journalEntryIds = journals.map(({ entry: { id } }) => id);

  const invoiceJournals = await tx
    .select({
      journalEntryId: invoiceJournalTable.journalEntryId,
      invoiceId: invoiceJournalTable.invoiceId,
      type: invoiceJournalTable.type,
    })
    .from(invoiceJournalTable)
    .where(inArray(invoiceJournalTable.journalEntryId, journalEntryIds));

  const invoiceJournalByEntryId = new Map(
    invoiceJournals.map(({ journalEntryId, ...invoiceJournal }) => [
      journalEntryId,
      invoiceJournal,
    ]),
  );

  const periodJournals = await tx
    .select({
      journalEntryId: periodJournalTable.journalEntryId,
      periodId: periodJournalTable.periodId,
      type: periodJournalTable.type,
    })
    .from(periodJournalTable)
    .where(inArray(periodJournalTable.journalEntryId, journalEntryIds));

  const periodJournalByEntryId = new Map(
    periodJournals.map(({ journalEntryId, ...periodJournal }) => [journalEntryId, periodJournal]),
  );

  const movementJournals = await tx
    .select({
      journalEntryId: movementJournalTable.journalEntryId,
      movementId: movementJournalTable.movementId,
      bankRelationId: movementsTable.bankRelationId,
    })
    .from(movementJournalTable)
    .innerJoin(movementsTable, eq(movementsTable.id, movementJournalTable.movementId))
    .where(inArray(movementJournalTable.journalEntryId, journalEntryIds));

  const movementJournalByEntryId = new Map(
    movementJournals.map(({ journalEntryId, ...movementJournal }) => [
      journalEntryId,
      movementJournal,
    ]),
  );

  const vatPostings = await tx
    .select({
      journalEntryId: postingsTable.journalEntryId,
      postingId: postingManualVatPostingsTable.postingId,
      vatPostingId: postingManualVatPostingsTable.vatPostingId,
    })
    .from(postingManualVatPostingsTable)
    .innerJoin(postingsTable, eq(postingsTable.id, postingManualVatPostingsTable.postingId))
    .where(inArray(postingsTable.journalEntryId, journalEntryIds));

  return journals.map((journal) =>
    CompositesSchema.JournalSummariesSchema.SelectJournalSummariesSchema.parse({
      ...journal,
      invoiceJournal: invoiceJournalByEntryId.get(journal.entry.id) ?? null,
      periodJournal: periodJournalByEntryId.get(journal.entry.id) ?? null,
      movementJournal: movementJournalByEntryId.get(journal.entry.id) ?? null,
      vatPostings: vatPostings
        .filter(({ journalEntryId }) => journalEntryId === journal.entry.id)
        .map(({ postingId, vatPostingId }) => ({ postingId, vatPostingId })),
    }),
  );
};
