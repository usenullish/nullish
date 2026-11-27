import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { AccountLedgerReport } from "../../../src/ledger/reports/account-ledger";
import { insertJournal } from "../../../src/ledger/_helpers/journal";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "validOn" as const, direction: "desc" as const },
};

describe("AccountLedgerReport", () => {
  let orgId: string;
  let periodId: string;
  let accountId: string;
  let postingId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);

    const [period] = await db
      .insert(periods)
      .values({
        organizationId: orgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      })
      .returning();
    assertNonNullish(period);
    periodId = period.id;

    accountId = await leafAccountId(db, orgId, AccountType.ASSET);
    const incomeId = await leafAccountId(db, orgId, AccountType.INCOME);

    const journal = await db.transaction((tx) =>
      insertJournal({
        tx,
        values: {
          entry: { organizationId: orgId, validOn: new Date("2026-03-15"), reference: "SALE" },
          postings: [
            {
              accountId,
              description: null,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 10000n,
              credit: 0n,
            },
            {
              accountId: incomeId,
              description: null,
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 10000n,
            },
          ],
        },
      }),
    );

    const [posting] = journal.postings.filter((posting) => posting.accountId === accountId);
    assertNonNullish(posting);
    postingId = posting.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const report = ({ userId = TEST_USER_ID }: { userId?: string } = {}) =>
    AccountLedgerReport.create({ db, userId, organizationId: orgId });

  describe("list", () => {
    test("returns the postings of the account for the period", async () => {
      const result = await report().list({ periodId, accountId, ...QUERY });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.postings.map(({ postingId: id }) => id)).toEqual([postingId]);
      expect(result.result.totals).toEqual({ baseDebit: 10000n, baseCredit: 0n, balance: 10000n });
    });

    test("accepts the list query of the API without a count", async () => {
      const result = await report().list({ periodId, accountId, ...QUERY, count: undefined });

      expect(result.status).toBe("success");
    });

    test("accepts the list query of the API with a count", async () => {
      const result = await report().list({
        periodId,
        accountId,
        ...QUERY,
        count: { mode: "exact" },
      });

      expect(result.status).toBe("success");
    });

    test("returns an error for a sort field the report does not have", async () => {
      const result = await report().list({
        periodId,
        accountId,
        ...QUERY,
        sort: { field: "unknown", direction: "asc" },
      });

      expect(result.status).toBe("error");
    });

    test("returns no postings to a user who is not a member of the organization", async () => {
      const result = await report({ userId: TEST_OTHER_USER_ID }).list({
        periodId,
        accountId,
        ...QUERY,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.postings).toEqual([]);
    });
  });
});
