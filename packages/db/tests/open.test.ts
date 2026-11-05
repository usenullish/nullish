import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { DbInstance } from "../src/db/instance";
import { openDb } from "../src/open";
import * as envModule from "@usenullish/nullish-env";
import * as setupModule from "../src/_setup";

describe("openDb", () => {
  afterEach(() => {
    spyOn(envModule, "envDbUrl").mockRestore();
    spyOn(setupModule, "migrate").mockRestore();
  });

  test("resolves to a success Result wrapping a DbInstance", async () => {
    const result = await openDb();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result).toBeInstanceOf(DbInstance);
    expect(result).not.toHaveProperty("err");
  });

  test("exposes a usable connection after migrating", async () => {
    const result = await openDb();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(typeof result.result.connection.execute).toBe("function");
  });

  test("runs the schema migrations against the opened instance's connection", async () => {
    const migrateSpy = spyOn(setupModule, "migrate");

    const result = await openDb();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(migrateSpy).toHaveBeenCalledWith({ db: result.result.connection });
  });

  test("returns the thrown error untouched instead of throwing when the url cannot be built", async () => {
    const cause = new Error("missing db credentials");
    spyOn(envModule, "envDbUrl").mockImplementation(() => {
      throw cause;
    });

    const result = await openDb();

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBe(cause);
    expect(result).not.toHaveProperty("result");
  });

  test("returns the thrown error untouched instead of throwing when migrate fails", async () => {
    const cause = new Error("migration failed");
    spyOn(setupModule, "migrate").mockImplementation(() => {
      throw cause;
    });

    const result = await openDb();

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBe(cause);
    expect(result).not.toHaveProperty("result");
  });
});
