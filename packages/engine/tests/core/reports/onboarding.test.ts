import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { OnboardingReport } from "../../../src/core/reports/onboarding";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createBankRelation,
  createClient,
  createDraftInvoice,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl(), { bigint: true });
const db = drizzle({ client });

const reportFor = ({
  organizationId,
  userId = TEST_USER_ID,
}: {
  organizationId: string;
  userId?: DbStoreInitArgs["userId"];
}): OnboardingReport =>
  OnboardingReport.create({ db: db as unknown as DbStoreInitArgs["db"], userId, organizationId });

const generate = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId?: DbStoreInitArgs["userId"];
}) => {
  const result = await reportFor({ organizationId, userId }).generate();

  if (result.status === "error") {
    throw result.err;
  }

  return result.result;
};

describe("onboarding report", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("has nothing for a new organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    expect(await generate({ organizationId })).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });

  test("has clients once a client exists", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await createClient(db, organizationId);

    expect(await generate({ organizationId })).toEqual({
      hasClients: true,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });

  test("has invoices once a draft invoice exists", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const clientId = await createClient(db, organizationId);
    await createDraftInvoice(db, { organizationId, clientId });

    expect(await generate({ organizationId })).toEqual({
      hasClients: true,
      hasInvoices: true,
      hasBankRelations: false,
    });
  });

  test("has bank relations once a bank account exists", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await createBankRelation(db, organizationId);

    expect(await generate({ organizationId })).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: true,
    });
  });

  test("ignores the data of other organizations", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const otherOrganizationId = await createOrganization(db, TEST_USER_ID);
    await createClient(db, otherOrganizationId);
    await createBankRelation(db, otherOrganizationId);

    expect(await generate({ organizationId })).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });

  test("has nothing for a user who is not a member", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await createClient(db, organizationId);
    await createBankRelation(db, organizationId);

    expect(await generate({ organizationId, userId: TEST_OTHER_USER_ID })).toEqual({
      hasClients: false,
      hasInvoices: false,
      hasBankRelations: false,
    });
  });
});
