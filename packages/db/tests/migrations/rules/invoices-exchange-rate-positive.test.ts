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

describe("check_invoices_exchange_rate_positive", () => {
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

  test("rejects a zero exchange_rate", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "EUR",
        exchangeRate: 0,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("exchange_rate must be greater than 0");
  });

  test("rejects a negative exchange_rate", async () => {
    const error = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "EUR",
        exchangeRate: -1,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("exchange_rate must be greater than 0");
  });

  test("accepts a positive exchange_rate", async () => {
    const [row] = await db
      .insert(invoices)
      .values({
        organizationId,
        clientId,
        issueOn: new Date("2026-01-01"),
        currency: "EUR",
        exchangeRate: 1.2,
      })
      .returning();

    expect(row?.exchangeRate).toBe(1.2);
  });
});
