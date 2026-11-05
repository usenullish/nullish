import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { AccountType, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import {
  MigrateAccountsDuplicateError,
  MigrateAccountsService,
  MigrateAccountsUnknownParentError,
} from "../../src/services/accounts.migrate";
import {
  accountByCode,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  systemAccountByPurpose,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withAuthenticatedUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("MigrateAccountsService", () => {
  let orgId: string;
  let otherOrgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigrateAccountsService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateAccountsService.create({ organizationId }).migrate({ tx, ...args }),
      ),
    );

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

  test("creates the new accounts and links them to their parent", async () => {
    const result = await migrate({
      accounts: [
        { code: "9600", type: AccountType.ASSET, name: "Parent" },
        { code: "9601", type: AccountType.ASSET, name: "Child", parentCode: "9600" },
      ],
    });

    expect(result.status).toBe("success");

    const parent = await accountByCode(db, orgId, "9600");
    const child = await accountByCode(db, orgId, "9601");

    expect(parent.name).toBe("Parent");
    expect(child.parentId).toBe(parent.id);
  });

  test("updates an existing account", async () => {
    const before = await accountByCode(db, orgId, "1020");

    const parent = await accountByCode(db, orgId, "100");

    const result = await migrate({
      accounts: [
        { code: "100", type: parent.type, name: parent.name ?? undefined },
        { code: "1020", type: before.type, name: "Bank UBS", parentCode: "100" },
      ],
    });

    expect(result.status).toBe("success");

    const after = await accountByCode(db, orgId, "1020");

    expect(after.name).toBe("Bank UBS");
    expect(after.version).toBe(before.version + 1);
  });

  test("binds a system account to the account of its purpose", async () => {
    const result = await migrate({
      accounts: [
        {
          code: "9610",
          type: AccountType.ASSET,
          name: "Bank",
          purpose: SystemAccountPurpose.BANK_ACCOUNT,
        },
      ],
    });

    expect(result.status).toBe("success");

    const account = await accountByCode(db, orgId, "9610");
    const bound = await systemAccountByPurpose(db, orgId, SystemAccountPurpose.BANK_ACCOUNT);

    expect(bound.accountId).toBe(account.id);
  });

  test("returns an error Result for duplicate codes", async () => {
    const result = await migrate({
      accounts: [
        { code: "9620", type: AccountType.ASSET },
        { code: "9620", type: AccountType.ASSET },
      ],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateAccountsDuplicateError);
  });

  test("returns an error Result for an unknown parent code", async () => {
    const result = await migrate({
      accounts: [{ code: "9630", type: AccountType.ASSET, parentCode: "9999" }],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateAccountsUnknownParentError);
  });

  test("returns an error Result in an organization of another user", async () => {
    const result = await migrate({
      organizationId: otherOrgId,
      accounts: [{ code: "9640", type: AccountType.ASSET }],
    });

    expect(result.status).toBe("error");
  });
});
