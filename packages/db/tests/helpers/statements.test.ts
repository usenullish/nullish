import { describe, expect, test, beforeEach, beforeAll, afterAll } from "bun:test";
import * as z from "zod";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  advisoryXactLock,
  deleteMany,
  insertMany,
  selectMany,
  updateMany,
} from "../../src/helpers/statements";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";

const table = pgTable("test_statements_widgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  version: integer("version").default(1).notNull(),
});

const RowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().transform((value) => value.toUpperCase()),
});

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("statements integration tests", () => {
  beforeAll(async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS test_statements_widgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version INTEGER NOT NULL DEFAULT 1
        );
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS test_statements_widgets;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_statements_widgets CASCADE;`);
  });

  describe("selectMany", () => {
    test("parses every row through the schema", async () => {
      await db.insert(table).values([{ name: "alpha" }, { name: "beta" }]);

      const rows = await db.transaction(async (tx) => selectMany({ tx, table, schema: RowSchema }));

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(["ALPHA", "BETA"]));
    });

    test("threads the where clause into the query builder", async () => {
      const [inserted] = await db.insert(table).values({ name: "alpha" }).returning();
      await db.insert(table).values({ name: "beta" });

      assertNonNullish(inserted);

      const rows = await db.transaction(async (tx) =>
        selectMany({
          tx,
          table,
          schema: RowSchema,
          where: eq(table.id, inserted.id),
        }),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("ALPHA");
    });

    test("acquires the requested row lock without error", async () => {
      await db.insert(table).values({ name: "alpha" });

      await db.transaction(async (tx) => {
        const rows = await selectMany({
          tx,
          table,
          schema: RowSchema,
          lock: "update",
        });
        expect(rows).toHaveLength(1);
      });
    });

    test("returns an empty array when there are no rows", async () => {
      const rows = await db.transaction(async (tx) => selectMany({ tx, table, schema: RowSchema }));
      expect(rows).toEqual([]);
    });

    test("rejects with a ZodError when a field has the wrong type", async () => {
      await db.insert(table).values({ name: "alpha" });

      const BadSchema = z.object({ id: z.number() });

      await expect(
        db.transaction(async (tx) => selectMany({ tx, table, schema: BadSchema })),
      ).rejects.toBeInstanceOf(z.ZodError);
    });

    test("propagates a query error without swallowing it", async () => {
      await expect(
        db.transaction(async (tx) =>
          selectMany({
            tx,
            table,
            schema: RowSchema,
            where: sql`INVALID_SYNTAX`,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("insertMany", () => {
    test("inserts the values into the table and returns the created rows", async () => {
      const rows = await db.transaction(async (tx) =>
        insertMany({
          tx,
          table,
          values: { name: "alpha" },
          returningSchema: RowSchema,
        }),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("ALPHA");
      expect(rows[0]?.id).toBeDefined();
    });

    test("rejects with a ZodError when a returned row does not match the schema", async () => {
      const BadSchema = z.object({ id: z.number() });

      await expect(
        db.transaction(async (tx) =>
          insertMany({
            tx,
            table,
            values: { name: "alpha" },
            returningSchema: BadSchema,
          }),
        ),
      ).rejects.toBeInstanceOf(z.ZodError);
    });

    test("propagates a write error without swallowing it", async () => {
      await db.insert(table).values({ name: "alpha" });

      await expect(
        db.transaction(async (tx) =>
          insertMany({
            tx,
            table,
            values: { name: "alpha" },
            returningSchema: RowSchema,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("updateMany", () => {
    test("updates the matching rows and returns the updated rows", async () => {
      const [inserted] = await db.insert(table).values({ name: "alpha" }).returning();

      assertNonNullish(inserted);

      const rows = await db.transaction(async (tx) =>
        updateMany({
          tx,
          table,
          values: { name: "beta" },
          returningSchema: RowSchema,
          where: eq(table.id, inserted.id),
        }),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("BETA");
    });

    test("rejects with a ZodError when a returned row does not match the schema", async () => {
      const [inserted] = await db.insert(table).values({ name: "alpha" }).returning();

      assertNonNullish(inserted);

      const BadSchema = z.object({ id: z.number() });

      await expect(
        db.transaction(async (tx) =>
          updateMany({
            tx,
            table,
            values: { name: "beta" },
            returningSchema: BadSchema,
            where: eq(table.id, inserted.id),
          }),
        ),
      ).rejects.toBeInstanceOf(z.ZodError);
    });

    test("propagates a write error without swallowing it", async () => {
      const [row1] = await db.insert(table).values({ name: "alpha" }).returning();

      assertNonNullish(row1);

      await db.insert(table).values({ name: "beta" });

      await expect(
        db.transaction(async (tx) =>
          updateMany({
            tx,
            table,
            values: { name: "beta" },
            returningSchema: RowSchema,
            where: eq(table.id, row1.id),
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("deleteMany", () => {
    test("deletes the matching rows and returns the deleted rows", async () => {
      const [inserted] = await db.insert(table).values({ name: "alpha" }).returning();

      assertNonNullish(inserted);

      await db.insert(table).values({ name: "beta" });

      const rows = await db.transaction(async (tx) =>
        deleteMany({
          tx,
          table,
          returningSchema: RowSchema,
          where: eq(table.id, inserted.id),
        }),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("ALPHA");

      const remaining = await db.select().from(table);

      expect(remaining.map(({ name }) => name)).toEqual(["beta"]);
    });

    test("returns an empty array when nothing matches", async () => {
      await db.insert(table).values({ name: "alpha" });

      const rows = await db.transaction(async (tx) =>
        deleteMany({
          tx,
          table,
          returningSchema: RowSchema,
          where: eq(table.name, "unknown"),
        }),
      );

      expect(rows).toEqual([]);
    });

    test("rejects with a ZodError when a deleted row does not match the schema", async () => {
      const [inserted] = await db.insert(table).values({ name: "alpha" }).returning();

      assertNonNullish(inserted);

      const BadSchema = z.object({ id: z.number() });

      await expect(
        db.transaction(async (tx) =>
          deleteMany({
            tx,
            table,
            returningSchema: BadSchema,
            where: eq(table.id, inserted.id),
          }),
        ),
      ).rejects.toBeInstanceOf(z.ZodError);
    });
  });

  describe("advisoryXactLock", () => {
    const waitingAdvisoryLocks = async (): Promise<number> => {
      const rows = await db.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`,
      );

      return rows[0]?.count ?? 0;
    };

    const waitUntilWaiting = async (): Promise<void> => {
      while ((await waitingAdvisoryLocks()) === 0) {
        await Bun.sleep(10);
      }
    };

    const holdLock = ({ key }: { key: string }) => {
      const { promise: held, resolve: onHeld } = Promise.withResolvers<void>();
      const { promise: released, resolve: release } = Promise.withResolvers<void>();

      const done = db.transaction(async (tx) => {
        await advisoryXactLock({ tx, key });
        onHeld();
        await released;
      });

      return { held, release, done };
    };

    test("blocks another transaction on the same key until the first one ends", async () => {
      const events: string[] = [];

      const first = holdLock({ key: "test.advisory:same" });
      await first.held;

      const second = db.transaction(async (tx) => {
        await advisoryXactLock({ tx, key: "test.advisory:same" });
        events.push("second");
      });

      await waitUntilWaiting();

      events.push("first");
      first.release();

      await Promise.all([first.done, second]);

      expect(events).toEqual(["first", "second"]);
    });

    test("does not block a transaction on another key", async () => {
      const first = holdLock({ key: "test.advisory:one" });
      await first.held;

      await db.transaction((tx) => advisoryXactLock({ tx, key: "test.advisory:two" }));

      first.release();
      await first.done;

      expect(await waitingAdvisoryLocks()).toBe(0);
    });
  });
});
