import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createOrganization,
  invoices,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_invoices_base_currency_rate", () => {
  let organizationId: string;
  let clientId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    clientId = await createClient(db, organizationId);
  });

  test("rejects a base-currency invoice with an exchange_rate other than 1", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
        exchangeRate: 2,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "exchange_rate must be 1 when currency (CHF) matches base currency (CHF)",
    );
  });

  test("accepts a foreign-currency invoice with an exchange_rate other than 1", async () => {
    const [row] = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "EUR",
        exchangeRate: 1.05,
      })
      .returning();

    expect(row?.exchangeRate).toBe(1.05);
  });
});
