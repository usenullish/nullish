import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { and, eq } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  MigrateBalancesDuplicateError,
  MigrateBalancesNoPeriodError,
  MigrateBalancesService,
  MigrateBalancesUnbalancedError,
  MigrateBalancesUnknownAccountsError,
} from "../../src/services/balances.migrate";
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

const VALID_ON = new Date(Date.UTC(2026, 0, 1));

describe("MigrateBalancesService", () => {
  let orgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigrateBalancesService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateBalancesService.create({ organizationId }).migrate({ tx, ...args }),
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
        startOn: VALID_ON,
        endOn: new Date(Date.UTC(2026, 11, 31)),
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("returns an error Result for duplicate accounts", async () => {
    const result = await migrate({
      balances: [
        { code: "1020", amount: 100 },
        { code: "1020", amount: -100 },
      ],
      validOn: VALID_ON,
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateBalancesDuplicateError);
  });

  test("returns an error Result without an open period on the date", async () => {
    const result = await migrate({
      balances: [
        { code: "1020", amount: 100 },
        { code: "2800", amount: -100 },
      ],
      validOn: new Date(Date.UTC(2025, 0, 1)),
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateBalancesNoPeriodError);
  });

  test("returns an error Result for an unknown account", async () => {
    const result = await migrate({
      balances: [
        { code: "1020", amount: 100 },
        { code: "9999", amount: -100 },
      ],
      validOn: VALID_ON,
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateBalancesUnknownAccountsError);
  });

  test("returns an error Result for unbalanced balances", async () => {
    const result = await migrate({
      balances: [
        { code: "1020", amount: 100 },
        { code: "2800", amount: -90 },
      ],
      validOn: VALID_ON,
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateBalancesUnbalancedError);
  });

  test("books the opening balances as a migrated journal entry", async () => {
    const result = await migrate({
      balances: [
        { code: "1020", amount: 1000 },
        { code: "2800", amount: -1000 },
      ],
      validOn: VALID_ON,
    });

    expect(result.status).toBe("success");

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.organizationId, orgId), eq(journalEntries.migrated, true)));

    expect(entry?.validOn).toEqual(VALID_ON);

    const bank = await accountByCode(db, orgId, "1020");
    const equity = await accountByCode(db, orgId, "2800");

    const booked = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, entry?.id ?? ""));

    expect(
      booked
        .map(({ accountId, debit, credit }) => ({ accountId, debit, credit }))
        .toSorted((a, b) => Number(b.debit - a.debit)),
    ).toEqual([
      { accountId: bank.id, debit: 100000n, credit: 0n },
      { accountId: equity.id, debit: 0n, credit: 100000n },
    ]);
  });
});
