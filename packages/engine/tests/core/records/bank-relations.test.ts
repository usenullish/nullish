import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { AccountType, DbSchema } from "@usenullish/nullish-schema/db";
import {
  DbBankRelations,
  DbCollectionBankRelations,
} from "../../../src/core/records/bank-relations";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;

const IBAN = "CH9300762011623852957";
const OTHER_IBAN = "CH5604835012345678009";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedBankRelation = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(bankRelations)
    .values({
      organizationId,
      name: "Main bank",
      iban: IBAN,
      currency: "CHF",
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("bank-relations", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let assetAccountId: string;
  let store: DbBankRelations;
  let collectionStore: DbCollectionBankRelations;
  let bankRelationId: string;
  let siblingBankRelationId: string;
  let otherBankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    assetAccountId = await leafAccountId(db, orgId, AccountType.ASSET);

    store = DbBankRelations.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionBankRelations.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.delete(bankRelations);
    bankRelationId = await seedBankRelation(orgId);
    siblingBankRelationId = await seedBankRelation(siblingOrgId);
    otherBankRelationId = await seedBankRelation(otherOrgId);
  });

  describe("findById", () => {
    test("returns the bank relation of the caller's organization", async () => {
      const result = await store.find({ pKey: bankRelationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(bankRelationId);
      expect(result.result?.organizationId).toBe(orgId);
      expect(result.result?.iban).toBe(IBAN);
    });

    test("returns a bank relation of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingBankRelationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingBankRelationId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for a bank relation of another organization", async () => {
      const result = await store.find({ pKey: otherBankRelationId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the name and bumps the version", async () => {
      const result = await store.update({
        pKey: bankRelationId,
        values: { version: 1, name: "Renamed bank" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("Renamed bank");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: bankRelationId,
        values: { version: 999, name: "Stale rename" },
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result for a ledger account that is not an asset account", async () => {
      const result = await store.update({
        pKey: bankRelationId,
        values: { version: 1, accountId: await leafAccountId(db, orgId, AccountType.EXPENSE) },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, name: "Missing" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for a bank relation of another organization", async () => {
      const result = await store.update({
        pKey: otherBankRelationId,
        values: { version: 1, name: "Intruder rename" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the bank relations of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(bankRelationId);
      expect(result.result[0]?.organizationId).toBe(orgId);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the bank relation parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          name: "Second bank",
          iban: OTHER_IBAN,
          currency: "EUR",
          accountId: assetAccountId,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.name).toBe("Second bank");
      expect(result.result.iban).toBe(OTHER_IBAN);
      expect(result.result.currency).toBe("EUR");
      expect(result.result.accountId).toBe(assetAccountId);
      expect(result.result.version).toBe(1);
    });

    test("returns an error Result for a duplicate IBAN within the organization", async () => {
      const result = await collectionStore.insert({
        values: { name: "Duplicate", iban: IBAN, currency: "CHF", accountId: assetAccountId },
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result for a ledger account that is not an asset account", async () => {
      const result = await collectionStore.insert({
        values: {
          name: "Wrong account",
          iban: OTHER_IBAN,
          currency: "CHF",
          accountId: await leafAccountId(db, orgId, AccountType.EXPENSE),
        },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("delete", () => {
    test("deletes a bank relation and returns it", async () => {
      const result = await store.delete({ pKey: bankRelationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(bankRelationId);
      expect(await store.find({ pKey: bankRelationId })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("resolves to undefined and keeps a bank relation of another organization", async () => {
      const result = await store.delete({ pKey: otherBankRelationId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbBankRelations.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherBankRelationId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherBankRelationId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
