import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import { accountIdReference } from "./accounts";
import { sql } from "drizzle-orm";
import { LedgerSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationPolicies } from "../_policies";
import { currencyValue } from "../_currency";
import { monetaryFields } from "../_monetary";
import { date } from "../_temporal";

export const JournalEntriesSchema = LedgerSchema.table(
  "journal_entries",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    number: pg.integer().notNull().default(0),
    validOn: date().notNull(),
    reference: pg.text(),
    // Brought from the previous accounting tool (e.g. Bexio). Readonly afterwards.
    migrated: pg.boolean().notNull().default(false),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "journal_entries",
    }),
    pg.index("journal_entries_valid_on_idx").on(table.organizationId, table.validOn),
    pg.uniqueIndex("journal_entries_org_number_uidx").on(table.organizationId, table.number),
    pg.check("journal_entries_number_positive", sql`${table.number} > 0`),
  ],
);

export const journalEntryIdReference = () =>
  pg
    .uuid()
    // No cascade on purpose. Unlike a contact or an invoice line, a posting has its own rules
    // (open period, linked to an invoice, a period or a bank movement) and they need its journal
    // entry to be checked. That's why the journal composite (DbJournal) deletes the postings first,
    // then their entry.
    .references(() => JournalEntriesSchema.id)
    .notNull();

export const PostingsSchema = LedgerSchema.table(
  "postings",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    journalEntryId: journalEntryIdReference(),
    accountId: accountIdReference(),
    description: pg.text(),
    debit: currencyValue().notNull().default(0n),
    credit: currencyValue().notNull().default(0n),
    ...monetaryFields(),
    ...auditFields(),
  },
  (table) => [
    pg.check("debit_or_credit_not_both", sql`NOT (${table.debit} > 0 AND ${table.credit} > 0)`),
    pg.check("debit_or_credit_one_positive", sql`(${table.debit} > 0) OR (${table.credit} > 0)`),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "postings",
    }),
    pg.index("postings_journal_entry_account_idx").on(table.accountId, table.journalEntryId),
    pg.index("postings_journal_entry_idx").on(table.journalEntryId),
  ],
);
