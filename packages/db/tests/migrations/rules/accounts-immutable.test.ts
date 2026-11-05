import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  accounts,
  causeMessage,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_accounts_immutable", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("rejects changing organization_id once set", async () => {
    const accountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(accounts)
      .set({ organizationId: otherOrganizationId })
      .where(eq(accounts.id, accountId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing type while the account has no postings", async () => {
    const accountId = await leafAccountId(db, organizationId, AccountType.ASSET);

    const [updated] = await db
      .update(accounts)
      .set({ type: AccountType.EXPENSE })
      .where(eq(accounts.id, accountId))
      .returning();

    expect(updated?.type).toBe(AccountType.EXPENSE);
  });
});
