import type { Tx } from "@usenullish/nullish-db";
import { insertMany } from "@usenullish/nullish-db";
import { DbSchema, PeriodJournalEntryType } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type InsertPeriodJournalEntry = Records["Ledger"]["PeriodJournal"]["Insert"];

export const insertPeriodJournalEntry = async ({
  organizationId,
  journalEntryId,
  periodId,
  entryType,
  tx,
}: {
  organizationId: InsertPeriodJournalEntry["organizationId"];
  journalEntryId: InsertPeriodJournalEntry["journalEntryId"];
  periodId: InsertPeriodJournalEntry["periodId"];
  entryType: PeriodJournalEntryType;
  tx: Tx;
}): Promise<void> => {
  const entries = await insertMany({
    tx,
    table: DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema,
    values: [{ organizationId, periodId, journalEntryId, type: entryType }],
    returningSchema: RecordsSchema.Ledger.PeriodJournalSchema.SelectPeriodJournalEntriesSchema,
  });

  assertArrayExactlyOne(entries);
};
