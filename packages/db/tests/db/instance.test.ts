import { describe, expect, test } from "bun:test";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { DbInstance } from "../../src/db/instance";

const DB_URL = "postgresql://username:password@localhost:5432/nullish" as Common["PostgresUrl"];
const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope" as Common["PostgresUrl"];

describe("DbInstance", () => {
  describe("open", () => {
    test("returns a DbInstance", () => {
      const db = DbInstance.open({ url: DB_URL });
      expect(db).toBeInstanceOf(DbInstance);
    });

    test("does not connect eagerly", () => {
      // `new SQL(url)` is lazy, so opening with an unreachable host must not throw.
      expect(() => DbInstance.open({ url: UNREACHABLE_URL })).not.toThrow();
    });

    test("returns an independent instance on each call", () => {
      const a = DbInstance.open({ url: DB_URL });
      const b = DbInstance.open({ url: DB_URL });
      expect(a).not.toBe(b);
      expect(a.connection).not.toBe(b.connection);
    });
  });

  describe("connection", () => {
    test("exposes the drizzle query api", () => {
      const { connection } = DbInstance.open({ url: DB_URL });
      expect(typeof connection.execute).toBe("function");
      expect(typeof connection.transaction).toBe("function");
    });

    test("exposes the underlying bun-sql client", () => {
      const { connection } = DbInstance.open({ url: DB_URL });
      expect(connection.$client).toBeDefined();
      expect(typeof connection.$client.close).toBe("function");
    });

    test("returns the same instance on repeated access", () => {
      const db = DbInstance.open({ url: DB_URL });
      expect(db.connection).toBe(db.connection);
    });
  });

  describe("close", () => {
    test("resolves to a success Result", async () => {
      const db = DbInstance.open({ url: DB_URL });
      const result = await db.close();
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.result).toBeUndefined();
      }
    });

    test("returns a Result instead of throwing", async () => {
      const db = DbInstance.open({ url: DB_URL });
      const result = await db.close();
      expect(result).toHaveProperty("status");
      expect(["success", "error"]).toContain(result.status);
    });

    test("is safe to call more than once", async () => {
      const db = DbInstance.open({ url: DB_URL });
      await db.close();
      const second = await db.close();
      expect(["success", "error"]).toContain(second.status);
    });
  });
});
