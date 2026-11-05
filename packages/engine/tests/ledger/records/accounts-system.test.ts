import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import {
  DbCollectionSystemAccounts,
  DbSystemAccounts,
} from "../../../src/ledger/records/accounts-system";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";
import type { Records } from "@usenullish/nullish-schema/records";

const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const receivableSystemAccountId = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(
        eq(systemAccounts.organizationId, organizationId),
        eq(systemAccounts.purpose, SystemAccountPurpose.DEBTOR),
      ),
    );
  assertNonNullish(row);
  return row.id;
};

describe("accounts-system", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbSystemAccounts;
  let collectionStore: DbCollectionSystemAccounts;
  let systemAccountId: string;
  let siblingSystemAccountId: string;
  let otherSystemAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbSystemAccounts.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionSystemAccounts.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    systemAccountId = await receivableSystemAccountId(orgId);
    siblingSystemAccountId = await receivableSystemAccountId(siblingOrgId);
    otherSystemAccountId = await receivableSystemAccountId(otherOrgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the system account of the caller's organization", async () => {
      const result = await store.find({ pKey: systemAccountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(systemAccountId);
      expect(result.result?.purpose).toBe(SystemAccountPurpose.DEBTOR);
    });

    test("returns a system account of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingSystemAccountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingSystemAccountId);
    });

    test("resolves to undefined for a system account of another organization", async () => {
      const result = await store.find({ pKey: otherSystemAccountId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("bumps the version through the optimistic-lock trigger", async () => {
      const result = await store.update({
        pKey: systemAccountId,
        values: { version: 1, purpose: SystemAccountPurpose.DEBTOR },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: systemAccountId,
        values: { version: 999, purpose: SystemAccountPurpose.DEBTOR },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, purpose: SystemAccountPurpose.DEBTOR },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for a system account of another organization", async () => {
      const result = await store.update({
        pKey: otherSystemAccountId,
        values: { version: 1, purpose: SystemAccountPurpose.DEBTOR },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the system accounts of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(result.result.every((account) => account.organizationId === orgId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the system account parsed", async () => {
      await db
        .delete(systemAccounts)
        .where(
          and(
            eq(systemAccounts.organizationId, orgId),
            eq(systemAccounts.purpose, SystemAccountPurpose.BANK_ACCOUNT),
          ),
        );

      const [bankLedgerAccount] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.organizationId, orgId), eq(accounts.code, "1020")));
      assertNonNullish(bankLedgerAccount);

      const result = await collectionStore.insert({
        values: {
          accountId: bankLedgerAccount.id,
          purpose: SystemAccountPurpose.BANK_ACCOUNT,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.accountId).toBe(bankLedgerAccount.id);
      expect(result.result.purpose).toBe(SystemAccountPurpose.BANK_ACCOUNT);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionSystemAccounts;

    const list = (filters: Records["Ledger"]["SystemAccounts"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters,
      });

    beforeAll(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionSystemAccounts.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });
    });

    test("returns only the system account of the purpose", async () => {
      const result = await list({ purpose: SystemAccountPurpose.BANK_ACCOUNT });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ purpose }) => purpose)).toEqual([
        SystemAccountPurpose.BANK_ACCOUNT,
      ]);
    });

    test("returns only the system accounts bound to the account", async () => {
      const bank = await list({ purpose: SystemAccountPurpose.BANK_ACCOUNT });

      if (bank.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const [bankAccount] = bank.result;

      const result = await list({ accountId: bankAccount?.accountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(
        result.result.every(({ accountId }) => accountId === bankAccount?.accountId),
      ).toBeTrue();
    });
  });
});
