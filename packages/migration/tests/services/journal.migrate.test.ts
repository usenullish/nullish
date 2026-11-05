import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { and, eq } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import type { Migration } from "@usenullish/nullish-schema/migration";
import {
  MigrateJournalService,
  MigrateJournalUnknownAccountsError,
  MigrateJournalUnknownCurrenciesError,
  MigrateJournalUnknownVatError,
} from "../../src/services/journal.migrate";
import {
  accountByCode,
  createOrganization,
  createPeriod,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withAuthenticatedUser,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;

const entry = ({
  reference,
  debit = "1020",
  credit = "3200",
  amount = 100,
  currency = "CHF",
  vat,
}: {
  reference: string;
  debit?: string;
  credit?: string;
  amount?: number;
  currency?: string;
  vat?: string;
}): Migration["Foreign"]["JournalEntry"] => ({
  reference,
  validOn: new Date(Date.UTC(2026, 2, 1)),
  lines: [{ codes: { debit, credit }, amount, currency, exchangeRate: 1, vat }],
});

describe("MigrateJournalService", () => {
  let orgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigrateJournalService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateJournalService.create({ organizationId }).migrate({ tx, ...args }),
      ),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      createPeriod({
        tx,
        organizationId: orgId,
        startOn: new Date(Date.UTC(2026, 0, 1)),
        endOn: new Date(Date.UTC(2026, 11, 31)),
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("returns an error Result for unknown accounts", async () => {
    const result = await migrate({
      journal: [entry({ reference: "R-1", credit: "9999" })],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateJournalUnknownAccountsError);
  });

  test("returns an error Result for unknown currencies", async () => {
    const result = await migrate({
      journal: [entry({ reference: "R-1", currency: "XYZ" })],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateJournalUnknownCurrenciesError);
  });

  test("returns an error Result for unresolvable VAT codes", async () => {
    const result = await migrate({
      journal: [entry({ reference: "R-1", vat: "ZZ99 (8.10%)" })],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateJournalUnknownVatError);
  });

  test("books the entries as migrated, a negative amount swapping debit and credit", async () => {
    const result = await migrate({
      journal: [entry({ reference: "R-1", amount: 100 }), entry({ reference: "R-2", amount: -50 })],
    });

    expect(result.status).toBe("success");

    const bank = await accountByCode(db, orgId, "1020");
    const income = await accountByCode(db, orgId, "3200");

    const booked = await db
      .select({
        reference: journalEntries.reference,
        accountId: postings.accountId,
        debit: postings.debit,
        credit: postings.credit,
      })
      .from(postings)
      .innerJoin(journalEntries, eq(journalEntries.id, postings.journalEntryId))
      .where(and(eq(journalEntries.organizationId, orgId), eq(journalEntries.migrated, true)));

    expect(
      booked.toSorted((a, b) =>
        `${a.reference}${a.accountId}`.localeCompare(`${b.reference}${b.accountId}`),
      ),
    ).toEqual(
      [
        { reference: "R-1", accountId: bank.id, debit: 10000n, credit: 0n },
        { reference: "R-1", accountId: income.id, debit: 0n, credit: 10000n },
        { reference: "R-2", accountId: bank.id, debit: 0n, credit: 5000n },
        { reference: "R-2", accountId: income.id, debit: 5000n, credit: 0n },
      ].toSorted((a, b) =>
        `${a.reference}${a.accountId}`.localeCompare(`${b.reference}${b.accountId}`),
      ),
    );
  });
});
