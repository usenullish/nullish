import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
} from "@usenullish/nullish-schema/db";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import {
  DbCollectionJournalSummaries,
  DbJournalSummaries,
} from "../../../src/ledger/composites/journal-summaries";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIST_QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "validOn", direction: "asc" as const },
};

const setUpOrg = async (
  userId = TEST_USER_ID,
): Promise<{ orgId: string; assetAccountId: string; incomeAccountId: string }> => {
  const orgId = await createOrganization(db, userId);

  await db.insert(periods).values({
    organizationId: orgId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  return {
    orgId,
    assetAccountId: await leafAccountId(db, orgId, AccountType.ASSET),
    incomeAccountId: await leafAccountId(db, orgId, AccountType.INCOME),
  };
};

const insertJournalEntry = async ({
  orgId,
  assetAccountId,
  incomeAccountId,
  validOn,
  reference,
  userId = TEST_USER_ID,
}: {
  orgId: string;
  assetAccountId: string;
  incomeAccountId: string;
  validOn: Date;
  reference: string;
  userId?: typeof TEST_USER_ID | typeof TEST_OTHER_USER_ID;
}): Promise<string> => {
  const result = await DbCollectionJournal.create({ db, userId, foreignKeyId: orgId }).insert({
    values: {
      entry: { validOn, reference },
      postings: [
        {
          accountId: assetAccountId,
          description: null,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 10000n,
          credit: 0n,
        },
        {
          accountId: incomeAccountId,
          description: null,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 0n,
          credit: 10000n,
        },
      ],
    },
  });

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.entry.id;
};

const linkToInvoice = async ({
  orgId,
  journalEntryId,
  type,
}: {
  orgId: string;
  journalEntryId: string;
  type: InvoiceJournalEntryType;
}): Promise<string> => {
  const clientId = await createClient(db, orgId);
  const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });

  await db
    .insert(invoiceJournalEntries)
    .values({ organizationId: orgId, invoiceId, journalEntryId, type });

  return invoiceId;
};

describe("journal summaries", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("find", () => {
    test("finds an entry with its postings and no invoice journal", async () => {
      const org = await setUpOrg();
      const journalEntryId = await insertJournalEntry({
        ...org,
        validOn: new Date("2026-06-15"),
        reference: "MANUAL",
      });

      const result = await DbJournalSummaries.create({ db, userId: TEST_USER_ID }).find({
        pKey: journalEntryId,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.entry.id).toBe(journalEntryId);
      expect(result.result?.postings).toHaveLength(2);
      expect(result.result?.invoiceJournal).toBeNull();
    });

    test("finds an entry with the invoice it is linked to", async () => {
      const org = await setUpOrg();
      const journalEntryId = await insertJournalEntry({
        ...org,
        validOn: new Date("2026-06-15"),
        reference: "PAYMENT",
      });
      const invoiceId = await linkToInvoice({
        orgId: org.orgId,
        journalEntryId,
        type: InvoiceJournalEntryType.PAYMENT,
      });

      const result = await DbJournalSummaries.create({ db, userId: TEST_USER_ID }).find({
        pKey: journalEntryId,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.invoiceJournal).toEqual({
        invoiceId,
        type: InvoiceJournalEntryType.PAYMENT,
      });
    });

    test("finds no summary for an entry of another organization", async () => {
      const otherOrg = await setUpOrg(TEST_OTHER_USER_ID);
      const journalEntryId = await insertJournalEntry({
        ...otherOrg,
        validOn: new Date("2026-06-15"),
        reference: "OTHER",
        userId: TEST_OTHER_USER_ID,
      });

      const result = await DbJournalSummaries.create({ db, userId: TEST_USER_ID }).find({
        pKey: journalEntryId,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("finds no summary for a missing entry", async () => {
      const result = await DbJournalSummaries.create({ db, userId: TEST_USER_ID }).find({
        pKey: TEST_MISSING_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("list", () => {
    test("returns the invoice journal of every entry of the page", async () => {
      const org = await setUpOrg();
      const manualId = await insertJournalEntry({
        ...org,
        validOn: new Date("2026-01-10"),
        reference: "MANUAL",
      });
      const openId = await insertJournalEntry({
        ...org,
        validOn: new Date("2026-02-10"),
        reference: "OPEN",
      });
      const invoiceId = await linkToInvoice({
        orgId: org.orgId,
        journalEntryId: openId,
        type: InvoiceJournalEntryType.OPEN,
      });

      const result = await DbCollectionJournalSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: org.orgId,
      }).list(LIST_QUERY);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ entry: { id } }) => id)).toEqual([manualId, openId]);
      expect(result.result.map(({ invoiceJournal }) => invoiceJournal)).toEqual([
        null,
        { invoiceId, type: InvoiceJournalEntryType.OPEN },
      ]);
    });

    test("applies the journal filters", async () => {
      const org = await setUpOrg();
      await insertJournalEntry({ ...org, validOn: new Date("2026-01-10"), reference: "RENT" });
      const insuranceId = await insertJournalEntry({
        ...org,
        validOn: new Date("2026-02-10"),
        reference: "INSURANCE",
      });

      const result = await DbCollectionJournalSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: org.orgId,
      }).list({ ...LIST_QUERY, filters: { reference: "insurance" } });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ entry: { id } }) => id)).toEqual([insuranceId]);
    });

    test("returns an empty list for an organization without entries", async () => {
      const { orgId } = await setUpOrg();

      const result = await DbCollectionJournalSummaries.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list(LIST_QUERY);

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
