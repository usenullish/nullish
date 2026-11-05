import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema, EXCHANGE_RATE_ONE, VatType } from "@usenullish/nullish-schema/db";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  createJournal,
  CreateJournalError,
  listJournalEntriesWithVatRatesByOrgId,
} from "../../src/_helpers/journal";
import {
  accountByCode,
  createOrganization,
  createPeriod,
  createVatRate,
  createVatSettings,
  insertVatMethods,
  journalEntryByReference,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("journal helpers", () => {
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

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

  describe("createJournal", () => {
    test("creates a balanced entry with its postings inside the open period", async () => {
      const bank = await accountByCode(db, orgId, "1020");
      const debtor = await accountByCode(db, orgId, "1100");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createJournal({
          tx,
          organizationId: orgId,
          validOn: new Date(Date.UTC(2026, 5, 1)),
          reference: "REF-001",
          migrated: true,
          postings: [
            {
              accountId: bank.id,
              description: "Bank",
              debit: 10000n,
              credit: 0n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
            },
            {
              accountId: debtor.id,
              description: "Debtor",
              debit: 0n,
              credit: 10000n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const entries = await db
        .select()
        .from(DbSchema.Ledger.Journal.JournalEntriesSchema)
        .where(eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, orgId));

      expect(entries.length).toBe(1);
      expect(entries[0]!.reference).toBe("REF-001");
      expect(entries[0]!.migrated).toBeTrue();

      const postings = await db
        .select()
        .from(DbSchema.Ledger.Journal.PostingsSchema)
        .where(eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, entries[0]!.id));

      expect(postings.length).toBe(2);
      expect(postings.reduce((total, posting) => total + posting.debit, 0n)).toBe(10000n);
      expect(postings.reduce((total, posting) => total + posting.credit, 0n)).toBe(10000n);
    });

    test("creates an entry with a null reference", async () => {
      const bank = await accountByCode(db, orgId, "1020");
      const debtor = await accountByCode(db, orgId, "1100");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createJournal({
          tx,
          organizationId: orgId,
          validOn: new Date(Date.UTC(2026, 5, 1)),
          reference: null,
          postings: [
            {
              accountId: bank.id,
              description: "Bank",
              debit: 10000n,
              credit: 0n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
            },
            {
              accountId: debtor.id,
              description: "Debtor",
              debit: 0n,
              credit: 10000n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const entries = await db
        .select()
        .from(DbSchema.Ledger.Journal.JournalEntriesSchema)
        .where(
          and(
            eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, orgId),
            isNull(DbSchema.Ledger.Journal.JournalEntriesSchema.reference),
          ),
        );

      expect(entries.length).toBe(1);
      expect(entries[0]!.migrated).toBeFalse();
    });

    test("returns a CreateJournalError when the journal entry is not returned", async () => {
      const tx = {
        insert: () => ({ values: () => ({ returning: async () => [] }) }),
      } as unknown as Tx;

      const result = await createJournal({
        tx,
        organizationId: orgId,
        validOn: new Date(Date.UTC(2026, 5, 1)),
        reference: "REF-MISSING",
        postings: [
          {
            accountId: TEST_MISSING_ID,
            description: "Bank",
            debit: 10000n,
            credit: 0n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
          },
        ],
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(CreateJournalError);
    });
  });

  describe("listJournalEntriesWithVatRatesByOrgId", () => {
    let nonTaxableTurnoverId: string;
    let nonConsiderationId: string;

    const insertEntry = async ({
      userId = TEST_USER_ID,
      organizationId = orgId,
      reference,
      vatRateIds,
    }: {
      userId?: string;
      organizationId?: string;
      reference: string;
      vatRateIds: [string | null, string | null, string | null, string | null];
    }) => {
      const bank = await accountByCode(db, organizationId, "1020");
      const debtor = await accountByCode(db, organizationId, "1100");

      const [netDebit, netCredit, vatDebit, vatCredit] = vatRateIds;

      const result = await withUser(db, userId, (tx) =>
        createJournal({
          tx,
          organizationId,
          validOn: new Date(Date.UTC(2026, 6, 1)),
          reference,
          postings: [
            {
              accountId: bank.id,
              description: "Net",
              debit: 100000n,
              credit: 0n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: netDebit,
            },
            {
              accountId: debtor.id,
              description: "Net",
              debit: 0n,
              credit: 100000n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: netCredit,
            },
            {
              accountId: bank.id,
              description: "VAT",
              debit: 8100n,
              credit: 0n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: vatDebit,
            },
            {
              accountId: debtor.id,
              description: "VAT",
              debit: 0n,
              credit: 8100n,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: vatCredit,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      return await journalEntryByReference(db, organizationId, reference);
    };

    const listEntries = async (organizationId: string) => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listJournalEntriesWithVatRatesByOrgId({ tx, organizationId }),
      );

      if (result.status === "error") {
        throw result.err;
      }

      return result.result;
    };

    beforeAll(async () => {
      const [period] = await db
        .select({ id: DbSchema.Ledger.Periods.PeriodsSchema.id })
        .from(DbSchema.Ledger.Periods.PeriodsSchema)
        .where(eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, orgId));
      assertNonNullish(period);

      await createVatSettings(db, orgId);
      await insertVatMethods(db, orgId, { periodId: period.id });

      nonTaxableTurnoverId = await createVatRate(db, orgId, VatType.NON_TAXABLE_TURNOVER);
      nonConsiderationId = await createVatRate(db, orgId, VatType.NON_CONSIDERATION);
    });

    test("returns each journal entry once with its header", async () => {
      const entry = await insertEntry({
        reference: "Facture VAT-HEADER",
        vatRateIds: [null, null, null, null],
      });

      const entries = await listEntries(orgId);
      const listed = entries.filter(({ id }) => id === entry.id);

      expect(listed).toEqual([
        {
          id: entry.id,
          reference: "Facture VAT-HEADER",
          validOn: new Date(Date.UTC(2026, 6, 1)),
          vatRateIds: [],
          creditsIncome: false,
        },
      ]);
    });

    test("collects the VAT rate booked on the VAT postings only", async () => {
      const entry = await insertEntry({
        reference: "Facture VAT-SINGLE",
        vatRateIds: [null, null, nonTaxableTurnoverId, nonTaxableTurnoverId],
      });

      const entries = await listEntries(orgId);
      const listed = entries.find(({ id }) => id === entry.id);
      assertNonNullish(listed);

      expect(listed.vatRateIds).toEqual([nonTaxableTurnoverId]);
    });

    test("collects every distinct VAT rate of the postings", async () => {
      const entry = await insertEntry({
        reference: "Facture VAT-MULTIPLE",
        vatRateIds: [
          nonTaxableTurnoverId,
          nonTaxableTurnoverId,
          nonConsiderationId,
          nonConsiderationId,
        ],
      });

      const entries = await listEntries(orgId);
      const listed = entries.find(({ id }) => id === entry.id);
      assertNonNullish(listed);

      expect(listed.vatRateIds.toSorted()).toEqual(
        [nonTaxableTurnoverId, nonConsiderationId].toSorted(),
      );
    });

    test("includes journal entries booked without a reference", async () => {
      const entries = await listEntries(orgId);

      expect(entries.some(({ reference }) => reference === null)).toBeTrue();
    });

    test("excludes another organization's journal entries", async () => {
      await withUser(db, TEST_OTHER_USER_ID, (tx) =>
        createPeriod({
          tx,
          organizationId: otherOrgId,
          startOn: new Date(Date.UTC(2026, 0, 1)),
          endOn: new Date(Date.UTC(2026, 11, 31)),
        }),
      );

      const otherEntry = await insertEntry({
        userId: TEST_OTHER_USER_ID,
        organizationId: otherOrgId,
        reference: "Facture VAT-OTHER",
        vatRateIds: [null, null, null, null],
      });

      const entries = await listEntries(orgId);

      expect(entries.some(({ id }) => id === otherEntry.id)).toBeFalse();
    });

    test("returns an empty list for an organization with no journal entries", async () => {
      const entries = await listEntries(TEST_MISSING_ORG_ID);

      expect(entries).toEqual([]);
    });
  });
});
