import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";
import type { Records } from "@usenullish/nullish-schema/records";
import { and, asc, between, eq } from "drizzle-orm";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

// The accounts that have at least one posting in the period, ordered by code. Those are e.g. the
// only accounts worth offering in the account ledger: any other one would show an empty list.
export const listActiveAccountIds = async ({
  tx,
  organizationId,
  periodId,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Reports["Ledger"]["Args"]): Promise<Reports["Ledger"]["ActiveAccountIds"]["Result"]> => {
  const accounts = await tx
    .selectDistinct({
      id: DbSchema.Ledger.Accounts.AccountsSchema.id,
      code: DbSchema.Ledger.Accounts.AccountsSchema.code,
    })
    .from(DbSchema.Ledger.Journal.PostingsSchema)
    .innerJoin(
      DbSchema.Ledger.Journal.JournalEntriesSchema,
      eq(
        DbSchema.Ledger.Journal.PostingsSchema.journalEntryId,
        DbSchema.Ledger.Journal.JournalEntriesSchema.id,
      ),
    )
    .innerJoin(
      DbSchema.Ledger.Accounts.AccountsSchema,
      eq(
        DbSchema.Ledger.Accounts.AccountsSchema.id,
        DbSchema.Ledger.Journal.PostingsSchema.accountId,
      ),
    )
    .innerJoin(
      DbSchema.Ledger.Periods.PeriodsSchema,
      and(
        eq(
          DbSchema.Ledger.Periods.PeriodsSchema.organizationId,
          DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId,
        ),
        between(
          DbSchema.Ledger.Journal.JournalEntriesSchema.validOn,
          DbSchema.Ledger.Periods.PeriodsSchema.startOn,
          DbSchema.Ledger.Periods.PeriodsSchema.endOn,
        ),
      ),
    )
    .where(
      and(
        eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId),
        eq(DbSchema.Ledger.Periods.PeriodsSchema.id, periodId),
      ),
    )
    .orderBy(asc(DbSchema.Ledger.Accounts.AccountsSchema.code));

  return ReportsSchema.LedgerSchema.ActiveAccountIdsSchema.parse(accounts.map(({ id }) => id));
};
