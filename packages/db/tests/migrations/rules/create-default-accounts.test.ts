import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType, LegalForm, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  accountByCode,
  accounts,
  createOrganization,
  resetDb,
  seedUsers,
  systemAccountByPurpose,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("seed_default_accounts_for_organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  test("seeds a non-empty chart of accounts from the llc template", async () => {
    const organizationId = await createOrganization(db);

    const rows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId));

    expect(rows.length).toBeGreaterThan(0);
  });

  test("wires parent_id to match the template hierarchy", async () => {
    const organizationId = await createOrganization(db);

    const bankRelation = await accountByCode(db, organizationId, "1020");
    const root = await accountByCode(db, organizationId, "1");

    expect(bankRelation.type).toBe(AccountType.ASSET);
    expect(bankRelation.parentId).not.toBeNull();
    expect(root.parentId).toBeNull();
  });

  test("creates system account references for known purposes", async () => {
    const organizationId = await createOrganization(db);

    const bankSystemAccount = await systemAccountByPurpose(
      db,
      organizationId,
      SystemAccountPurpose.BANK_ACCOUNT,
    );
    const bankRelation = await accountByCode(db, organizationId, "1020");

    expect(bankSystemAccount.accountId).toBe(bankRelation.id);
  });

  test("seeds the same chart of accounts for a corporation as for an llc", async () => {
    const llcId = await createOrganization(db, { legalForm: LegalForm.LLC });
    const corporationId = await createOrganization(db, { legalForm: LegalForm.CORPORATION });

    const codes = async (organizationId: string): Promise<string[]> => {
      const rows = await db
        .select({ code: accounts.code })
        .from(accounts)
        .where(eq(accounts.organizationId, organizationId));

      return rows.map(({ code }) => code).sort();
    };

    expect(await codes(corporationId)).toEqual(await codes(llcId));
  });

  test("wires parent_id and system accounts for a corporation", async () => {
    const organizationId = await createOrganization(db, { legalForm: LegalForm.CORPORATION });

    const bankRelation = await accountByCode(db, organizationId, "1020");
    const bankSystemAccount = await systemAccountByPurpose(
      db,
      organizationId,
      SystemAccountPurpose.BANK_ACCOUNT,
    );

    expect(bankRelation.parentId).not.toBeNull();
    expect(bankSystemAccount.accountId).toBe(bankRelation.id);
  });

  test("seeds a sole proprietorship with its owner equity accounts", async () => {
    const organizationId = await createOrganization(db, {
      legalForm: LegalForm.SOLE_PROPRIETORSHIP,
    });

    const privateAccount = await accountByCode(db, organizationId, "2850");
    const contributions = await accountByCode(db, organizationId, "2820");

    expect(privateAccount.type).toBe(AccountType.EQUITY);
    expect(privateAccount.parentId).not.toBeNull();
    expect(contributions.type).toBe(AccountType.EQUITY);
  });

  test("maps the annual result of a sole proprietorship to 2891", async () => {
    const organizationId = await createOrganization(db, {
      legalForm: LegalForm.SOLE_PROPRIETORSHIP,
    });

    const annualResult = await systemAccountByPurpose(
      db,
      organizationId,
      SystemAccountPurpose.ANNUAL_RESULT,
    );
    const account = await accountByCode(db, organizationId, "2891");

    expect(annualResult.accountId).toBe(account.id);
  });

  test("creates every system account for a sole proprietorship", async () => {
    const organizationId = await createOrganization(db, {
      legalForm: LegalForm.SOLE_PROPRIETORSHIP,
    });

    const purposes = await Promise.all(
      Object.values(SystemAccountPurpose).map((purpose) =>
        systemAccountByPurpose(db, organizationId, purpose),
      ),
    );

    expect(purposes).toHaveLength(Object.values(SystemAccountPurpose).length);
  });
});
