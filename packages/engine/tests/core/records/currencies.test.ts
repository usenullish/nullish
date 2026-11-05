import { afterAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbCurrencies } from "../../../src/core/records/currencies";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const store = DbCurrencies.create({
  db: db as unknown as DbStoreInitArgs["db"],
  userId: TEST_USER_ID,
});

describe("currencies", () => {
  afterAll(async () => {
    await client.close();
  });

  describe("list", () => {
    test("returns the currencies seeded by the migrations", async () => {
      const result = await store.list({
        pagination: { limit: 1000, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const codes = result.result.map((currency) => currency.code);
      expect(codes).toEqual(expect.arrayContaining(["CHF", "EUR", "USD"]));
    });
  });

  describe("find", () => {
    test("returns the currency matching the code", async () => {
      const result = await store.find({ pKey: "CHF" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.code).toBe("CHF");
      expect(result.result?.decimals).toBe(2);
    });

    test("resolves to undefined for an unknown code", async () => {
      const result = await store.find({ pKey: "XXX" });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("insert", () => {
    test("returns an error Result when inserting without a code", async () => {
      const result = await store.insert({ values: { decimals: 2 } });

      expect(result.status).toBe("error");
    });
  });

  describe("update", () => {
    test("always returns an error Result", async () => {
      const result = await store.update({ values: {}, pKey: "CHF" });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(Error);
    });
  });

  describe("delete", () => {
    test("always returns an error Result", async () => {
      const result = await store.delete({ pKey: "CHF" });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(Error);
    });
  });
});
