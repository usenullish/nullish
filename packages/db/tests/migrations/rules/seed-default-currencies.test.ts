import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { CurrencyType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { currencies } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("seed_default_currencies", () => {
  afterAll(async () => {
    await client.close();
  });

  test("seeds CHF, EUR and USD with the correct decimals", async () => {
    const rows = await db
      .select({ code: currencies.code, decimals: currencies.decimals })
      .from(currencies)
      .where(inArray(currencies.code, ["CHF", "EUR", "USD"]));

    const byCode = new Map(rows.map((row) => [row.code, row.decimals]));

    expect(byCode.get("CHF")).toBe(2);
    expect(byCode.get("EUR")).toBe(2);
    expect(byCode.get("USD")).toBe(2);
  });

  test.each([
    ["JPY", 0],
    ["KWD", 3],
    ["BTC", 8],
    ["ETH", 18],
    ["USDC", 6],
    ["SOL", 9],
    ["DOT", 10],
    ["XLM", 7],
    ["BNB", 18],
    ["XMR", 12],
    ["NEAR", 24],
  ])("seeds %s with %i decimals", async (code, decimals) => {
    const [row] = await db
      .select({ decimals: currencies.decimals })
      .from(currencies)
      .where(eq(currencies.code, code));

    expect(row?.decimals).toBe(decimals);
  });

  test("seeds the ISO currencies as fiat", async () => {
    const rows = await db
      .select({ code: currencies.code })
      .from(currencies)
      .where(eq(currencies.type, CurrencyType.FIAT));

    expect(rows).toHaveLength(157);
    expect(rows.every(({ code }) => /^[A-Z]{3}$/.test(code))).toBeTrue();
  });

  test("seeds the crypto currencies as crypto", async () => {
    const rows = await db
      .select({ code: currencies.code })
      .from(currencies)
      .where(eq(currencies.type, CurrencyType.CRYPTO))
      .orderBy(currencies.code);

    expect(rows.map(({ code }) => code)).toEqual([
      "ADA",
      "AVAX",
      "BCH",
      "BNB",
      "BTC",
      "DAI",
      "DOGE",
      "DOT",
      "ETH",
      "ICP",
      "LINK",
      "LTC",
      "NEAR",
      "SOL",
      "TRX",
      "USDC",
      "USDT",
      "XLM",
      "XMR",
      "XRP",
    ]);
  });
});
