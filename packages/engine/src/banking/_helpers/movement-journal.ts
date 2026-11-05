import type { Tx } from "@usenullish/nullish-db";
import { insertMany } from "@usenullish/nullish-db";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectMovementJournalEntries = Records["Banking"]["MovementJournal"]["Select"];
type InsertMovementJournalEntries = Records["Banking"]["MovementJournal"]["Insert"];

export const insertMovementJournalEntry = async ({
  tx,
  organizationId,
  movementId,
  journalEntryId,
}: {
  tx: Tx;
  organizationId: InsertMovementJournalEntries["organizationId"];
  movementId: InsertMovementJournalEntries["movementId"];
  journalEntryId: InsertMovementJournalEntries["journalEntryId"];
}): Promise<void> => {
  const movementJournalEntries = await insertMany<
    SelectMovementJournalEntries,
    Db["Banking"]["MovementJournal"]
  >({
    tx,
    table: DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema,
    values: { organizationId, movementId, journalEntryId },
    returningSchema: RecordsSchema.Banking.MovementJournalSchema.SelectMovementJournalEntriesSchema,
  });

  assertArrayExactlyOne(movementJournalEntries);
};
