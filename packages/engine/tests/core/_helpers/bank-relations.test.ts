import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { getBankRelation, listBankRelations } from "../../../src/core/_helpers/bank-relations";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createBankRelation,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("getBankRelation", () => {
  let organizationId: string;
  let bankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
  });

  afterAll(async () => {
    await resetDb(db);
  });

  test("returns the bank relation", async () => {
    const bankRelation = await db.transaction((tx) => getBankRelation({ tx, id: bankRelationId }));

    expect(bankRelation.id).toBe(bankRelationId);
    expect(bankRelation.organizationId).toBe(organizationId);
  });

  test("rejects when the bank relation does not exist", async () => {
    await expect(
      db.transaction((tx) => getBankRelation({ tx, id: TEST_MISSING_ID })),
    ).rejects.toThrow();
  });
});

describe("listBankRelations", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    await createBankRelation(db, organizationId);
    await createBankRelation(db, organizationId, { iban: "CH5604835012345678009" });

    const otherOrganizationId = await createOrganization(db, TEST_USER_ID);
    await createBankRelation(db, otherOrganizationId);
  });

  afterAll(async () => {
    await resetDb(db);
  });

  test("lists the bank relations of the organization only", async () => {
    const bankRelations = await db.transaction((tx) =>
      listBankRelations({ tx, organizationId, orderBy: [], pagination: { limit: 10, offset: 0 } }),
    );

    expect(bankRelations.map(({ iban }) => iban).toSorted()).toEqual([
      "CH5604835012345678009",
      "CH9300762011623852957",
    ]);
  });

  test("applies the pagination", async () => {
    const bankRelations = await db.transaction((tx) =>
      listBankRelations({ tx, organizationId, orderBy: [], pagination: { limit: 1, offset: 0 } }),
    );

    expect(bankRelations).toHaveLength(1);
  });
});

afterAll(async () => {
  await client.close();
});
