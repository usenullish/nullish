import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  resetDb,
  seedUsers,
  systemAccountId,
  systemAccounts,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_organization_immutable", () => {
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
    const rowId = await systemAccountId(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(systemAccounts)
      .set({ organizationId: otherOrganizationId })
      .where(eq(systemAccounts.id, rowId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });
});
