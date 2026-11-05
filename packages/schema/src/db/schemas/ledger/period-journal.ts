import { LedgerSchema } from "./_schema";
import { primaryKey } from "../_common";
import { periodIdReference } from "./periods";
import { organizationIdReference } from "../core/organizations";
import { journalEntryIdReference } from "./journal";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";
import * as pg from "drizzle-orm/pg-core";
import { PeriodJournalEntryType } from "../../constants/period-journal";

export const periodJournalEntryType = LedgerSchema.enum(
  "period_journal_entry_type",
  PeriodJournalEntryType,
);

export const PeriodJournalEntriesSchema = LedgerSchema.table(
  "period_journal_entries",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    periodId: periodIdReference(),
    journalEntryId: journalEntryIdReference(),
    type: periodJournalEntryType().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("period_journal_entries_journal_entry_id_uidx").on(table.journalEntryId),
    pg.uniqueIndex("period_journal_entries_period_type_uidx").on(table.periodId, table.type),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "period_journal_entries",
    }),
  ],
);
