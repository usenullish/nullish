import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, LegalForm, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { getSystemAccounts } from "../../../src/ledger/_helpers/accounts-system";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("getSystemAccounts", () => {
  let orgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    await createOrganization(db, TEST_OTHER_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const SOLE_PROPRIETORSHIP_PURPOSES = [
    SystemAccountPurpose.CAPITAL_CONTRIBUTIONS,
    SystemAccountPurpose.PRIVATE_ACCOUNT,
  ];

  test.each<{ legalForm: LegalForm; unbound: SystemAccountPurpose[] }>([
    { legalForm: LegalForm.LLC, unbound: SOLE_PROPRIETORSHIP_PURPOSES },
    { legalForm: LegalForm.CORPORATION, unbound: SOLE_PROPRIETORSHIP_PURPOSES },
    { legalForm: LegalForm.SOLE_PROPRIETORSHIP, unbound: [] },
  ])(
    "maps every purpose of the chart of a $legalForm to the organization's seeded system account",
    async ({ legalForm, unbound }) => {
      const organizationId = await createOrganization(db, TEST_USER_ID, { legalForm });

      const result = await db.transaction((tx) => getSystemAccounts({ tx, organizationId }));

      expect(Object.keys(result).sort()).toEqual(Object.values(SystemAccountPurpose).sort());

      const bound = Object.values(SystemAccountPurpose).filter(
        (purpose) => !unbound.includes(purpose),
      );

      expect(bound.map((purpose) => result[purpose]?.organizationId)).toEqual(
        bound.map(() => organizationId),
      );
      expect(unbound.map((purpose) => result[purpose])).toEqual(unbound.map(() => undefined));
    },
  );

  test("maps a purpose with no system account to undefined", async () => {
    await db
      .delete(systemAccounts)
      .where(
        and(
          eq(systemAccounts.organizationId, orgId),
          eq(systemAccounts.purpose, SystemAccountPurpose.BANK_ACCOUNT),
        ),
      );

    const result = await db.transaction((tx) => getSystemAccounts({ tx, organizationId: orgId }));

    expect(result[SystemAccountPurpose.BANK_ACCOUNT]).toBeUndefined();
    expect(result[SystemAccountPurpose.DEBTOR]).toBeDefined();
  });
});
