import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const reloptions = async ({ schema, name }: { schema: string; name: string }): Promise<unknown> => {
  const [row] = await db.execute<{ reloptions: string[] | null }>(sql`
    SELECT c.reloptions
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${schema} AND c.relname = ${name} AND c.relkind = 'v'
  `);

  return row?.reloptions;
};

describe("views filtering by the current user", () => {
  afterAll(async () => {
    await client.close();
  });

  test.each([
    ["core", "organization_members"],
    ["ledger", "account_balances"],
    ["ledger", "balance_sheet"],
    ["ledger", "income_statement"],
  ])("%s.%s is a security barrier", async (schema, name) => {
    expect(await reloptions({ schema, name })).toContain("security_barrier=true");
  });
});
