import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AccountType, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import {
  createAccounts,
  listAccountsByOrgId,
  listSystemAccountsByOrgId,
  updateAccountParents,
  updateAccounts,
  updateSystemAccounts,
} from "../../src/_helpers/accounts";
import {
  accountByCode,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  systemAccountByPurpose,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("accounts helpers", () => {
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("listAccountsByOrgId", () => {
    test("returns the chart of accounts seeded for the organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listAccountsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(10);
      expect(result.result.every((account) => account.organizationId === orgId)).toBeTrue();
    });

    test("excludes another organization's accounts", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listAccountsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((account) => account.organizationId === otherOrgId)).toBeFalse();
    });

    test("returns an empty list for an organization with no accounts", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listAccountsByOrgId({ tx, organizationId: TEST_MISSING_ORG_ID }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("createAccounts", () => {
    test("inserts every account for the organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createAccounts({
          tx,
          organizationId: orgId,
          accounts: [
            { code: "9500", type: AccountType.ASSET, name: "Petty cash" },
            { code: "9501", type: AccountType.EXPENSE, name: null },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const named = await accountByCode(db, orgId, "9500");
      expect(named.type).toBe(AccountType.ASSET);
      expect(named.organizationId).toBe(orgId);
      expect(named.name).toBe("Petty cash");
      expect(named.version).toBe(1);

      const unnamed = await accountByCode(db, orgId, "9501");
      expect(unnamed.name).toBeNull();
    });
  });

  describe("updateAccounts", () => {
    test("changes the type and name of an account that has no postings", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createAccounts({
          tx,
          organizationId: orgId,
          accounts: [{ code: "9010", type: AccountType.ASSET, name: "Draft" }],
        }),
      );

      const before = await accountByCode(db, orgId, "9010");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateAccounts({
          tx,
          accounts: [{ id: before.id, type: AccountType.LIABILITY, name: "Renamed" }],
        }),
      );

      expect(result.status).toBe("success");

      const after = await accountByCode(db, orgId, "9010");
      expect(after.type).toBe(AccountType.LIABILITY);
      expect(after.name).toBe("Renamed");
      expect(after.version).toBe(before.version + 1);
    });

    test("clears the name when set to null", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createAccounts({
          tx,
          organizationId: orgId,
          accounts: [{ code: "9011", type: AccountType.ASSET, name: "Temporary" }],
        }),
      );

      const before = await accountByCode(db, orgId, "9011");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateAccounts({
          tx,
          accounts: [{ id: before.id, type: AccountType.ASSET, name: null }],
        }),
      );

      expect(result.status).toBe("success");

      const after = await accountByCode(db, orgId, "9011");
      expect(after.name).toBeNull();
    });
  });

  describe("updateAccountParents", () => {
    test("links a child account to its parent by code", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createAccounts({
          tx,
          organizationId: orgId,
          accounts: [
            { code: "9510", type: AccountType.ASSET, name: null },
            { code: "9511", type: AccountType.ASSET, name: null },
          ],
        }),
      );

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateAccountParents({
          tx,
          organizationId: orgId,
          links: [{ code: "9511", parentCode: "9510" }],
        }),
      );

      expect(result.status).toBe("success");

      const parent = await accountByCode(db, orgId, "9510");
      const child = await accountByCode(db, orgId, "9511");
      expect(child.parentId).toBe(parent.id);
    });

    test("clears the parent when parentCode is null", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateAccountParents({
          tx,
          organizationId: orgId,
          links: [{ code: "9511", parentCode: null }],
        }),
      );

      expect(result.status).toBe("success");

      const child = await accountByCode(db, orgId, "9511");
      expect(child.parentId).toBeNull();
    });
  });

  describe("updateSystemAccounts", () => {
    test("rebinds a purpose to a different account", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createAccounts({
          tx,
          organizationId: orgId,
          accounts: [{ code: "9300", type: AccountType.ASSET, name: null }],
        }),
      );

      const target = await accountByCode(db, orgId, "9300");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateSystemAccounts({
          tx,
          organizationId: orgId,
          bindings: [{ purpose: SystemAccountPurpose.BANK_ACCOUNT, code: "9300" }],
        }),
      );

      expect(result.status).toBe("success");

      const bound = await systemAccountByPurpose(db, orgId, SystemAccountPurpose.BANK_ACCOUNT);
      expect(bound.accountId).toBe(target.id);
    });
  });

  describe("listSystemAccountsByOrgId", () => {
    test("returns the system accounts seeded for the organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listSystemAccountsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(result.result.every((account) => account.organizationId === orgId)).toBeTrue();
      expect(
        result.result.some((account) => account.purpose === SystemAccountPurpose.DEBTOR),
      ).toBeTrue();
    });

    test("excludes another organization's system accounts", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listSystemAccountsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((account) => account.organizationId === otherOrgId)).toBeFalse();
    });
  });
});
