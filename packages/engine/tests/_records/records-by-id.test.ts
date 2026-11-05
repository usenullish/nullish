import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import type { Option, Result } from "@usenullish/nullish-common";
import { DbRecordsById } from "../../src/_records/records-by-id";
import type { DbStoreInitArgs } from "../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";

const widgets = pgTable("test_engine_records_by_id_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(0),
  owner: text("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const WidgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
});
type Widget = z.infer<typeof WidgetSchema>;

const NumberIdSchema = z.object({ id: z.number() });

const USER_ID = "user-00000000-0000-4000-8000-000000000000" as DbStoreInitArgs["userId"];
const INTRUDER_ID = "user-11111111-1111-4111-8111-111111111111" as DbStoreInitArgs["userId"];

const MISSING_ID = "99999999-9999-4999-8999-999999999999";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

type UpdateValues = { name?: string | null; version: number };

class TestRecordsById extends DbRecordsById<typeof widgets> {
  constructor(args: DbStoreInitArgs) {
    super({ ...args, table: widgets });
  }

  queryOneById<T>(args: { id: unknown; schema: z.ZodType<T> }): Promise<Result<Option<T>>> {
    return this._queryOneById(args);
  }

  updateAndReturnOneById<T>(args: {
    id: unknown;
    values: UpdateValues;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return this._updateAndReturnOneById(args as never);
  }

  deleteAndReturnOneById<T>(args: {
    id: unknown;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<Option<T>>> {
    return this._deleteAndReturnOneById(args);
  }
}

const records = new TestRecordsById({
  db: db as unknown as DbStoreInitArgs["db"],
  userId: USER_ID,
});

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";
const unreachableRecords = (): TestRecordsById =>
  new TestRecordsById({
    db: drizzle({ client: new BunSQL(UNREACHABLE_URL) }) as unknown as DbStoreInitArgs["db"],
    userId: USER_ID,
  });

const seed = async (
  rows: { name: string; version?: number; owner?: string | null }[],
): Promise<Widget[]> => {
  const inserted = await db.insert(widgets).values(rows).returning();
  return inserted.map((row) => WidgetSchema.parse(row));
};

const allRows = async (): Promise<Widget[]> => {
  const rows = await db.select().from(widgets);
  return rows.map((row) => WidgetSchema.parse(row));
};

const namesOf = (rows: readonly Widget[]): string[] => rows.map((row) => row.name).sort();

describe("records-by-id", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_records_by_id_widgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      owner TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
  `);

    await db.execute(sql`GRANT USAGE ON SCHEMA public TO authenticated_user;`);
    await db.execute(
      sql`GRANT SELECT, INSERT, UPDATE, DELETE ON test_engine_records_by_id_widgets TO authenticated_user;`,
    );

    await db.execute(sql`ALTER TABLE test_engine_records_by_id_widgets ENABLE ROW LEVEL SECURITY;`);
    await db.execute(sql`DROP POLICY IF EXISTS owner_scope ON test_engine_records_by_id_widgets;`);
    await db.execute(sql`
    CREATE POLICY owner_scope ON test_engine_records_by_id_widgets
      FOR ALL
      USING (owner IS NULL OR owner = auth.current_user_id())
      WITH CHECK (true);
  `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_records_by_id_widgets;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_engine_records_by_id_widgets CASCADE;`);
  });

  describe("DbRecordsById._queryOneById", () => {
    test("resolves to the row whose id column matches, parsed through the schema", async () => {
      const [alpha, beta] = await seed([{ name: "alpha" }, { name: "beta" }]);
      assertNonNullish(alpha);
      assertNonNullish(beta);

      const result = await records.queryOneById({ id: alpha.id, schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: alpha });
    });

    test("resolves to undefined when the id matches nothing", async () => {
      const result = await records.queryOneById({ id: MISSING_ID, schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when the id belongs to another user", async () => {
      const [row] = await seed([{ name: "theirs", owner: INTRUDER_ID }]);
      assertNonNullish(row);

      const result = await records.queryOneById({ id: row.id, schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("returns an error Result when the row fails schema validation", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.queryOneById({ id: row.id, schema: NumberIdSchema });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().queryOneById({
        id: MISSING_ID,
        schema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecordsById._updateAndReturnOneById", () => {
    test("returns the single updated row, parsed through the returning schema", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOneById({
        id: row.id,
        values: { name: "beta", version: 5 },
        returningSchema: WidgetSchema,
      });

      expect(result).toEqual({
        status: "success",
        result: { id: row.id, name: "beta", version: 5 },
      });
    });

    test("forwards the caller's values to the update set", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      await records.updateAndReturnOneById({
        id: row.id,
        values: { name: "beta", version: 7 },
        returningSchema: WidgetSchema,
      });

      expect(await allRows()).toEqual([{ id: row.id, name: "beta", version: 7 }]);
    });

    test("filters the update on the id column", async () => {
      const [alpha, beta] = await seed([{ name: "alpha" }, { name: "beta" }]);
      assertNonNullish(alpha);
      assertNonNullish(beta);

      await records.updateAndReturnOneById({
        id: alpha.id,
        values: { name: "renamed", version: 0 },
        returningSchema: WidgetSchema,
      });

      expect(namesOf(await allRows())).toEqual(["beta", "renamed"]);
    });

    test("errors with InvalidArrayLengthError when the id matches no rows", async () => {
      const result = await records.updateAndReturnOneById({
        id: MISSING_ID,
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError when the id belongs to another user", async () => {
      const [row] = await seed([{ name: "theirs", owner: INTRUDER_ID }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOneById({
        id: row.id,
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors when the updated row does not match the returning schema", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOneById({
        id: row.id,
        values: { name: "beta", version: 3 },
        returningSchema: NumberIdSchema,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().updateAndReturnOneById({
        id: MISSING_ID,
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the update itself rejects", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOneById({
        id: row.id,
        values: { name: null, version: 0 },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecordsById._deleteAndReturnOneById", () => {
    test("deletes the row and returns it, parsed through the returning schema", async () => {
      const [alpha, beta] = await seed([{ name: "alpha" }, { name: "beta" }]);
      assertNonNullish(alpha);
      assertNonNullish(beta);

      const result = await records.deleteAndReturnOneById({
        id: alpha.id,
        returningSchema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: alpha });
      expect(await allRows()).toEqual([beta]);
    });

    test("resolves to undefined when the id matches nothing", async () => {
      await seed([{ name: "alpha" }]);

      const result = await records.deleteAndReturnOneById({
        id: MISSING_ID,
        returningSchema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: undefined });
      expect(await allRows()).toHaveLength(1);
    });

    test("resolves to undefined and keeps the row when it belongs to another user", async () => {
      const [row] = await seed([{ name: "theirs", owner: INTRUDER_ID }]);
      assertNonNullish(row);

      const result = await records.deleteAndReturnOneById({
        id: row.id,
        returningSchema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: undefined });
      expect(await allRows()).toEqual([row]);
    });

    test("returns an error Result and keeps the row when it fails schema validation", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.deleteAndReturnOneById({
        id: row.id,
        returningSchema: NumberIdSchema,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
      expect(await allRows()).toEqual([row]);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().deleteAndReturnOneById({
        id: MISSING_ID,
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });
  });
});
