import * as pg from "drizzle-orm/pg-core";
import { BankingSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";
import { journalEntryIdReference } from "../ledger/journal";
import { movementIdReference } from "./movements";
import { organizationIdReference } from "../core/organizations";

export const MovementJournalEntriesSchema = BankingSchema.table(
  "movement_journal_entries",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    movementId: movementIdReference(),
    journalEntryId: journalEntryIdReference(),
    ...auditFields(),
  },
  (table) => [
    pg
      .uniqueIndex("movement_journal_entries_movement_entry_uidx")
      .on(table.movementId, table.journalEntryId),
    pg.index("movement_journal_entries_journal_entry_idx").on(table.journalEntryId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "movement_journal_entries",
    }),
  ],
);
