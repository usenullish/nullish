import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { causeMessage, currencies } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_currencies_decimals_immutable", () => {
  afterAll(async () => {
    await client.close();
  });

  test("rejects changing decimals once set", async () => {
    const error = await db
      .update(currencies)
      .set({ decimals: 3 })
      .where(eq(currencies.code, "CHF"))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("decimals cannot be changed once set");
  });

  test("allows an update that keeps decimals unchanged", async () => {
    const [updated] = await db
      .update(currencies)
      .set({ decimals: 2 })
      .where(eq(currencies.code, "CHF"))
      .returning();

    expect(updated?.decimals).toBe(2);
  });
});
