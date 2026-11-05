import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import {
  AccountType,
  DbMaterializedView,
  DbSchema,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import { DbAccounts, DbCollectionAccounts } from "../../../src/ledger/records/accounts";
import { DbCollectionJournal } from "../../../src/ledger/composites/journal";
import type { DbCollectionStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  leafAccountId,
  readAccountBalance,
  waitFor,
} from "../../_test-utils";
import type { Records } from "@usenullish/nullish-schema/records";

const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accountBalancesMv = DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const firstAccountId = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId))
    .limit(1);
  assertNonNullish(row);
  return row.id;
};

describe("accounts", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbAccounts;
  let collectionStore: DbCollectionAccounts;
  let seededAccountId: string;
  let siblingAccountId: string;
  let otherAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbAccounts.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionAccounts.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    seededAccountId = await firstAccountId(orgId);
    siblingAccountId = await firstAccountId(siblingOrgId);
    otherAccountId = await firstAccountId(otherOrgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the account when it belongs to the caller's organization", async () => {
      const result = await store.find({ pKey: seededAccountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(seededAccountId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns an account of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingAccountId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingAccountId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for an account of another organization", async () => {
      const result = await store.find({ pKey: otherAccountId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("applies the change and bumps the version", async () => {
      const created = await collectionStore.insert({
        values: { code: "9010", type: AccountType.ASSET, name: "Old" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: {
          version: created.result.version,
          code: "9011",
          type: AccountType.LIABILITY,
          name: "New",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.code).toBe("9011");
      expect(result.result.type).toBe(AccountType.LIABILITY);
      expect(result.result.name).toBe("New");
      expect(result.result.version).toBe(2);
    });

    test("clears name when set to null", async () => {
      const created = await collectionStore.insert({
        values: { code: "9020", type: AccountType.ASSET, name: "Named" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, name: null },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBeNull();
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: seededAccountId,
        values: { version: 999, type: AccountType.ASSET },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, type: AccountType.ASSET },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for an account of another organization", async () => {
      const result = await store.update({
        pKey: otherAccountId,
        values: { version: 1, type: AccountType.ASSET },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the accounts of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(10);
      expect(result.result.every((account) => account.organizationId === orgId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the account parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          code: "9001",
          type: AccountType.ASSET,
          name: "Cash",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.code).toBe("9001");
      expect(result.result.type).toBe(AccountType.ASSET);
      expect(result.result.name).toBe("Cash");
      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.version).toBe(1);
    });

    test("leaves name null when it is omitted", async () => {
      const result = await collectionStore.insert({
        values: {
          code: "9002",
          type: AccountType.ASSET,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBeNull();
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionAccounts;
    let filtersOrgId: string;
    let uniqueAccountId: string;

    const list = (filters: Records["Ledger"]["Accounts"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 1000, offset: 0 },
        sort: { field: "code", direction: "asc" },
        filters,
      });

    beforeAll(async () => {
      filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionAccounts.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      const unique = await filtersStore.insert({
        values: { code: "FLT-1", type: AccountType.ASSET, name: "Filters Unique Name" },
      });

      if (unique.status === "error") {
        throw unique.err;
      }

      uniqueAccountId = unique.result.id;
    });

    test("returns only the accounts of the type", async () => {
      const result = await list({ type: AccountType.EXPENSE });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(result.result.every(({ type }) => type === AccountType.EXPENSE)).toBeTrue();
    });

    test("returns only the children of the parent", async () => {
      const [child] = await db
        .select({ id: accounts.id, parentId: accounts.parentId })
        .from(accounts)
        .where(and(eq(accounts.organizationId, filtersOrgId), isNotNull(accounts.parentId)))
        .limit(1);

      assertNonNullish(child);
      assertNonNullish(child.parentId);

      const result = await list({ parentId: child.parentId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toContain(child.id);
      expect(result.result.every(({ parentId }) => parentId === child.parentId)).toBeTrue();
    });

    test.each([["unique name"], ["flt-1"]])(
      "returns the accounts whose name or code contains the search %p",
      async (search) => {
        const result = await list({ search });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(result.result.map(({ id }) => id)).toEqual([uniqueAccountId]);
      },
    );
  });

  describe("account balances", () => {
    let balancesOrgId: string;
    let assetAccountId: string;

    beforeAll(async () => {
      balancesOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: balancesOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      assetAccountId = await leafAccountId(db, balancesOrgId, AccountType.ASSET);
      const incomeAccountId = await leafAccountId(db, balancesOrgId, AccountType.INCOME);

      const journal = DbCollectionJournal.create({
        db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
        userId: TEST_USER_ID,
        foreignKeyId: balancesOrgId,
      });

      const inserted = await journal.insert({
        values: {
          entry: { validOn: new Date("2026-06-15"), reference: "TEST-ENTRY" },
          postings: [
            {
              accountId: assetAccountId,
              description: "Debit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 1000n,
              credit: 0n,
            },
            {
              accountId: incomeAccountId,
              description: "Credit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 1000n,
            },
          ],
        },
      });

      if (inserted.status === "error") {
        throw inserted.err;
      }

      await waitFor(
        () => readAccountBalance(db, assetAccountId),
        (balance) => balance?.totalDebit === 1000n,
      );
    });

    test("refreshes the account balances after an update", async () => {
      const found = await store.find({ pKey: assetAccountId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      assertNonNullish(found.result);

      const result = await store.update({
        pKey: assetAccountId,
        values: { version: found.result.version, name: "Renamed" },
      });

      expect(result.status).toBe("success");

      const [row] = await waitFor(
        () =>
          db
            .select({ name: accountBalancesMv.name })
            .from(accountBalancesMv)
            .where(eq(accountBalancesMv.accountId, assetAccountId)),
        ([balance]) => balance?.name === "Renamed",
      );

      expect(row?.name).toBe("Renamed");
    });
  });

  describe("delete", () => {
    let deleteOrgId: string;
    let postedAccountId: string;

    beforeAll(async () => {
      deleteOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(periods).values({
        organizationId: deleteOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      postedAccountId = await leafAccountId(db, deleteOrgId, AccountType.ASSET);
      const incomeAccountId = await leafAccountId(db, deleteOrgId, AccountType.INCOME);

      const journal = DbCollectionJournal.create({
        db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
        userId: TEST_USER_ID,
        foreignKeyId: deleteOrgId,
      });

      const inserted = await journal.insert({
        values: {
          entry: { validOn: new Date("2026-06-15"), reference: "TEST-ENTRY" },
          postings: [
            {
              accountId: postedAccountId,
              description: "Debit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 1000n,
              credit: 0n,
            },
            {
              accountId: incomeAccountId,
              description: "Credit side",
              currency: "CHF",
              exchangeRate: EXCHANGE_RATE_ONE,
              vatRateId: null,
              debit: 0n,
              credit: 1000n,
            },
          ],
        },
      });

      if (inserted.status === "error") {
        throw inserted.err;
      }
    });

    test("deletes an account without postings and returns it", async () => {
      const created = await DbCollectionAccounts.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: deleteOrgId,
      }).insert({
        values: { code: "9001", type: AccountType.ASSET, name: "Deletable" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.delete({ pKey: created.result.id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(created.result.id);
      expect(await store.find({ pKey: created.result.id })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("returns an error Result and keeps an account with postings", async () => {
      const result = await store.delete({ pKey: postedAccountId });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: postedAccountId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(postedAccountId);
    });

    test("resolves to undefined and keeps an account of another organization", async () => {
      const result = await store.delete({ pKey: otherAccountId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbAccounts.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherAccountId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherAccountId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
