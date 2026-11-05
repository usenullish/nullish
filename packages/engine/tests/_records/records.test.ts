import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import {
  assertNonNullish,
  InvalidArrayLengthError,
  nonNullish,
  notEmptyString,
} from "@usenullish/nullish-common";
import type { Option, Result } from "@usenullish/nullish-common";
import {
  DbRecords,
  type DbRecordsFilters,
  type DbRecordsSortField,
} from "../../src/_records/records";
import { ilikeContains } from "../../src/_query/helpers";
import type { QueryArgs } from "@usenullish/nullish-schema/db";
import type { DbStoreInitArgs } from "../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";

const widgets = pgTable("test_engine_records_widgets", {
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

const BumpVersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number().transform((n) => n + 1),
});

const NumberIdSchema = z.object({ id: z.number() });

const USER_ID = "user-00000000-0000-4000-8000-000000000000" as DbStoreInitArgs["userId"];
const INTRUDER_ID = "user-11111111-1111-4111-8111-111111111111" as DbStoreInitArgs["userId"];

const ROW_ID_1 = "11111111-1111-4111-8111-111111111111";
const ROW_ID_2 = "22222222-2222-4222-8222-222222222222";
const ROW_ID_3 = "33333333-3333-4333-8333-333333333333";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

const PAGE = { limit: 100, offset: 0 };
const SORT = { field: "createdAt", direction: "asc" } as const;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const WidgetFiltersSchema = z.strictObject({
  owner: z.string().optional(),
  search: z.string().optional(),
});
type WidgetFilters = z.infer<typeof WidgetFiltersSchema>;

const widgetFilters = (values: Option<WidgetFilters>): DbRecordsFilters<WidgetFilters> => ({
  values,
  schema: WidgetFiltersSchema,
  where: ({ owner, search }) =>
    and(
      nonNullish(owner) ? eq(widgets.owner, owner) : undefined,
      notEmptyString(search) ? ilikeContains({ column: widgets.name, value: search }) : undefined,
    ),
});

type InsertValues = { name: string; owner?: string | null };
type UpdateValues = { name?: string | null; version: number };

class TestRecords extends DbRecords<"id", typeof widgets> {
  constructor(args: DbStoreInitArgs) {
    super({ ...args, table: widgets, pKey: "id" });
  }

  get table(): typeof widgets {
    return this._table;
  }

  query<T, TFilters = never>(
    args: {
      schema: z.ZodType<T>;
      where?: SQL;
      filters?: DbRecordsFilters<TFilters>;
    } & QueryArgs<DbRecordsSortField<typeof widgets>>,
  ): Promise<Result<T[]>> {
    return this._query(args);
  }

  queryAll<T>(
    args: { schema: z.ZodType<T>; where?: SQL } & Omit<
      QueryArgs<DbRecordsSortField<typeof widgets>>,
      "pagination"
    >,
  ): Promise<Result<T[]>> {
    return this._queryAll(args);
  }

  queryOne<T>(args: { schema: z.ZodType<T>; where?: SQL }): Promise<Result<Option<T>>> {
    return this._queryOne(args);
  }

  queryOneByPKey<T>(args: { pKey: unknown; schema: z.ZodType<T> }): Promise<Result<Option<T>>> {
    return this._queryOneByPKey(args);
  }

  insertAndReturnOne<T>(args: {
    values: InsertValues;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return this._insertAndReturnOne(args as never);
  }

  insertAndSelect<T>(args: {
    values: InsertValues;
    returningSchema: z.ZodType<T>;
    id: string;
  }): Promise<Result<T[]>> {
    return this._insertAndSelect(args as never);
  }

  insertAndSelectOne<T>(args: {
    values: InsertValues;
    returningSchema: z.ZodType<T>;
    id: string;
  }): Promise<Result<T>> {
    return this._insertAndSelectOne(args as never);
  }

  updateAndReturnOne<T>(args: {
    pKey: unknown;
    values: UpdateValues;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return this._updateAndReturnOne(args as never);
  }

  updateAndReturnOneBy<T>(args: {
    values: UpdateValues;
    returningSchema: z.ZodType<T>;
    where: SQL;
  }): Promise<Result<T>> {
    return this._updateAndReturnOneBy(args as never);
  }
}

const records = new TestRecords({
  db: db as unknown as DbStoreInitArgs["db"],
  userId: USER_ID,
});

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";
const unreachableRecords = (): TestRecords =>
  new TestRecords({
    db: drizzle({ client: new BunSQL(UNREACHABLE_URL) }) as unknown as DbStoreInitArgs["db"],
    userId: USER_ID,
  });

const seed = async (
  rows: {
    id?: string;
    name: string;
    version?: number;
    owner?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }[],
): Promise<Widget[]> => {
  const inserted = await db.insert(widgets).values(rows).returning();
  return inserted.map((row) => WidgetSchema.parse(row));
};

const allRows = async (): Promise<Widget[]> => {
  const rows = await db.select().from(widgets);
  return rows.map((row) => WidgetSchema.parse(row));
};

const namesOf = (rows: readonly Widget[]): string[] => rows.map((row) => row.name).sort();

const namesInOrder = (rows: readonly Widget[]): string[] => rows.map((row) => row.name);

const at = (minutes: number): Date => new Date(Date.UTC(2026, 0, 1, 0, minutes));

describe("records", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_records_widgets (
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
      sql`GRANT SELECT, INSERT, UPDATE, DELETE ON test_engine_records_widgets TO authenticated_user;`,
    );

    await db.execute(sql`ALTER TABLE test_engine_records_widgets ENABLE ROW LEVEL SECURITY;`);
    await db.execute(sql`DROP POLICY IF EXISTS owner_scope ON test_engine_records_widgets;`);
    await db.execute(sql`
    CREATE POLICY owner_scope ON test_engine_records_widgets
      FOR ALL
      USING (owner IS NULL OR owner = auth.current_user_id())
      WITH CHECK (true);
  `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_records_widgets;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_engine_records_widgets CASCADE;`);
  });

  describe("DbRecords._table", () => {
    test("exposes the table the store was constructed with", () => {
      expect(records.table).toBe(widgets);
    });
  });

  describe("DbRecords._query", () => {
    test("returns a success Result wrapping every row, parsed through the schema", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await records.query({ schema: WidgetSchema, pagination: PAGE, sort: SORT });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(2);
      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("applies the schema transform to each row", async () => {
      await seed([
        { name: "alpha", version: 1 },
        { name: "beta", version: 5 },
      ]);

      const result = await records.query({
        schema: BumpVersionSchema,
        pagination: PAGE,
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((r) => r.version).sort()).toEqual([2, 6]);
    });

    test("threads the where clause into the query builder", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await records.query({
        schema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
        pagination: PAGE,
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.name).toBe("alpha");
    });

    test("returns a success Result with an empty array when there are no rows", async () => {
      const result = await records.query({ schema: WidgetSchema, pagination: PAGE, sort: SORT });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns an error Result (not a throw) when a row fails schema validation", async () => {
      await seed([{ name: "alpha" }]);

      const result = await records.query({ schema: NumberIdSchema, pagination: PAGE, sort: SORT });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("rejects the whole batch when a single row is invalid", async () => {
      await seed([{ name: "ok" }, { name: "too-long" }]);

      const ShortName = z.object({
        id: z.string(),
        name: z.string().max(3),
        version: z.number(),
      });
      const result = await records.query({ schema: ShortName, pagination: PAGE, sort: SORT });

      expect(result.status).toBe("error");
    });

    test("scopes reads to the store's user id via the auth-scoped transaction", async () => {
      await seed([
        { name: "mine", owner: USER_ID },
        { name: "theirs", owner: INTRUDER_ID },
        { name: "shared", owner: null },
      ]);

      const result = await records.query({ schema: WidgetSchema, pagination: PAGE, sort: SORT });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["mine", "shared"]);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the underlying select rejects", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        where: sql`name > 42`,
        pagination: PAGE,
        sort: SORT,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecords._query filters", () => {
    const queryWithFilters = (values: Option<WidgetFilters>, where?: SQL) =>
      records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
        where,
        filters: widgetFilters(values),
      });

    test("narrows the rows to the ones matching the filters", async () => {
      await seed([
        { name: "alpha", owner: USER_ID },
        { name: "beta", owner: null },
        { name: "gamma", owner: null },
      ]);

      const result = await queryWithFilters({ owner: USER_ID });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha"]);
    });

    test("combines several filters", async () => {
      await seed([
        { name: "alpha", owner: USER_ID },
        { name: "beta", owner: USER_ID },
        { name: "alpine", owner: null },
      ]);

      const result = await queryWithFilters({ owner: USER_ID, search: "alp" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha"]);
    });

    test("combines the filters with the caller's where", async () => {
      await seed([
        { name: "alpha", owner: USER_ID },
        { name: "alpha", owner: null },
        { name: "beta", owner: USER_ID },
      ]);

      const result = await queryWithFilters({ owner: USER_ID }, eq(widgets.name, "alpha"));

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(namesOf(result.result)).toEqual(["alpha"]);
    });

    test("returns every row when the filters have no values", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await queryWithFilters(undefined);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("returns every row when no filter is set", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await queryWithFilters({});

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("ignores an empty search", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await queryWithFilters({ search: "" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("returns a ZodError Result when the filters do not match their schema", async () => {
      await seed([{ name: "alpha" }]);

      const result = await queryWithFilters({ unknown: "alpha" } as WidgetFilters);

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("still excludes rows hidden by the auth scope", async () => {
      await seed([
        { name: "mine", owner: USER_ID },
        { name: "theirs", owner: INTRUDER_ID },
      ]);

      const result = await queryWithFilters({ search: "i" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["mine"]);
    });

    test("matches a search case-insensitively", async () => {
      await seed([{ name: "Alpha" }, { name: "beta" }]);

      const result = await queryWithFilters({ search: "ALP" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["Alpha"]);
    });

    test.each([
      ["50%", ["50% off", "500 off"], ["50% off"]],
      ["a_b", ["a_b", "axb"], ["a_b"]],
      ["a\\b", ["a\\b", "ab"], ["a\\b"]],
    ])(
      "matches the wildcard characters of the search %p literally",
      async (search, names, expected) => {
        await seed(names.map((name) => ({ name })));

        const result = await queryWithFilters({ search });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(namesOf(result.result)).toEqual(expected);
      },
    );
  });

  describe("DbRecords._query pagination", () => {
    test("returns at most limit rows", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }, { name: "gamma" }]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 2, offset: 0 },
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(2);
    });

    test("skips offset rows", async () => {
      await seed([
        { id: ROW_ID_1, name: "alpha" },
        { id: ROW_ID_2, name: "beta" },
        { id: ROW_ID_3, name: "gamma" },
      ]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 2, offset: 2 },
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesInOrder(result.result)).toEqual(["alpha"]);
    });

    test("returns an empty page when offset is past the last row", async () => {
      await seed([{ name: "alpha" }]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 10, offset: 5 },
        sort: SORT,
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("walks every row exactly once across pages", async () => {
      await seed(
        ["alpha", "beta", "gamma", "delta", "epsilon"].map((name) => ({
          name,
          createdAt: at(0),
          updatedAt: at(0),
        })),
      );

      const pages = await Promise.all(
        [0, 2, 4].map((offset) =>
          records.query({ schema: WidgetSchema, pagination: { limit: 2, offset }, sort: SORT }),
        ),
      );

      const rows = pages.flatMap((page) => (page.status === "success" ? page.result : []));

      expect(namesOf(rows)).toEqual(["alpha", "beta", "delta", "epsilon", "gamma"]);
    });

    test("accepts the maximum limit", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 1000, offset: 0 },
        sort: SORT,
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test.each([
      { limit: 0, offset: 0 },
      { limit: 1001, offset: 0 },
      { limit: 1.5, offset: 0 },
      { limit: 10, offset: -1 },
      { limit: 10, offset: 0.5 },
    ])(
      "returns a ZodError Result for the limit $limit and the offset $offset",
      async (pagination) => {
        const result = await records.query({ schema: WidgetSchema, pagination, sort: SORT });

        if (result.status === "success") {
          expect(true).toBeFalse();
          return;
        }

        expect(result.err).toBeInstanceOf(z.ZodError);
      },
    );

    test("returns a ZodError Result for unknown pagination keys", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 10, offset: 0, page: 1 } as never,
        sort: SORT,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });
  });

  describe("DbRecords._query sort", () => {
    test("returns a ZodError Result when sort is missing", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: undefined as never,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("orders by the given field ascending", async () => {
      await seed([{ name: "gamma" }, { name: "alpha" }, { name: "beta" }]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: { field: "name", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesInOrder(result.result)).toEqual(["alpha", "beta", "gamma"]);
    });

    test("orders by the given field descending", async () => {
      await seed([
        { name: "first", createdAt: at(1) },
        { name: "third", createdAt: at(3) },
        { name: "second", createdAt: at(2) },
      ]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: { field: "createdAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesInOrder(result.result)).toEqual(["third", "second", "first"]);
    });

    test("breaks ties on the sort field by primary key descending", async () => {
      await seed([
        { id: ROW_ID_1, name: "one", updatedAt: at(5) },
        { id: ROW_ID_3, name: "three", updatedAt: at(5) },
        { id: ROW_ID_2, name: "two", updatedAt: at(5) },
      ]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: { field: "updatedAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesInOrder(result.result)).toEqual(["three", "two", "one"]);
    });

    test("applies the sort before the page is cut", async () => {
      await seed([{ name: "gamma" }, { name: "alpha" }, { name: "beta" }]);

      const result = await records.query({
        schema: WidgetSchema,
        pagination: { limit: 1, offset: 1 },
        sort: { field: "name", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesInOrder(result.result)).toEqual(["beta"]);
    });

    test("returns a ZodError Result for an unknown sort field", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: { field: "nope" as never, direction: "asc" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns a ZodError Result for an unknown sort direction", async () => {
      const result = await records.query({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: { field: "name", direction: "up" as never },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });
  });

  describe("DbRecords._queryAll", () => {
    test.each([0, 1, 999, 1000, 1001, 2500])(
      "returns every row exactly once for %p rows",
      async (count) => {
        if (count > 0) {
          await seed(Array.from({ length: count }, (_, i) => ({ name: `w-${i}` })));
        }

        const result = await records.queryAll({ schema: WidgetSchema, sort: SORT });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(result.result).toHaveLength(count);
        expect(new Set(result.result.map(({ id }) => id)).size).toBe(count);
      },
    );

    test("threads the where clause into every page", async () => {
      await seed(Array.from({ length: 1500 }, (_, i) => ({ name: i % 3 === 0 ? "keep" : "drop" })));

      const result = await records.queryAll({
        schema: WidgetSchema,
        where: eq(widgets.name, "keep"),
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(500);
      expect(result.result.every(({ name }) => name === "keep")).toBeTrue();
    });

    test("keeps the sort order across pages", async () => {
      await seed(
        Array.from({ length: 1200 }, (_, i) => ({ name: `w-${String(i).padStart(4, "0")}` })),
      );

      const result = await records.queryAll({
        schema: WidgetSchema,
        sort: { field: "name", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const names = namesInOrder(result.result);

      expect(names).toEqual([...names].sort());
    });

    test("returns a ZodError Result for an unknown sort field", async () => {
      const result = await records.queryAll({
        schema: WidgetSchema,
        sort: { field: "nope" as never, direction: "asc" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().queryAll({ schema: WidgetSchema, sort: SORT });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecords._queryOne", () => {
    test("resolves to a success Result holding undefined when nothing matches", async () => {
      const result = await records.queryOne({ schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to the single matching row", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.queryOne({ schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: row });
    });

    test("returns an InvalidArrayLengthError when more than one row matches", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await records.queryOne({ schema: WidgetSchema });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("propagates a schema-validation failure from the underlying read", async () => {
      await seed([{ name: "alpha" }]);

      const result = await records.queryOne({ schema: NumberIdSchema });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("propagates a transaction failure from the underlying read", async () => {
      const result = await unreachableRecords().queryOne({
        schema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("forwards the where clause to the read", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await records.queryOne({
        schema: WidgetSchema,
        where: eq(widgets.name, "beta"),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.name).toBe("beta");
    });
  });

  describe("DbRecords._queryOneByPKey", () => {
    test("returns the row matching the primary key", async () => {
      const [alpha, beta] = await seed([{ name: "alpha" }, { name: "beta" }]);
      assertNonNullish(alpha);
      assertNonNullish(beta);

      const result = await records.queryOneByPKey({
        pKey: alpha.id,
        schema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: alpha });
    });

    test("resolves to undefined when the primary key matches nothing", async () => {
      const result = await records.queryOneByPKey({
        pKey: MISSING_ID,
        schema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when the primary key belongs to another user", async () => {
      const [row] = await seed([{ name: "theirs", owner: INTRUDER_ID }]);
      assertNonNullish(row);

      const result = await records.queryOneByPKey({
        pKey: row.id,
        schema: WidgetSchema,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("DbRecords._insertAndReturnOne", () => {
    test("returns the single created row, parsed through the returning schema", async () => {
      const result = await records.insertAndReturnOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("alpha");
      expect(result.result.version).toBe(0);
      expect(result.result.id).toBeDefined();
    });

    test("forwards the caller's values to the insert verbatim", async () => {
      await records.insertAndReturnOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      const rows = await allRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("alpha");
      expect(rows[0]?.version).toBe(0);
    });

    test("returns an error Result when the auth scope rejects the inserted row", async () => {
      const result = await records.insertAndReturnOne({
        values: { name: "alpha", owner: INTRUDER_ID },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("errors when the returned row does not match the returning schema", async () => {
      const result = await records.insertAndReturnOne({
        values: { name: "alpha" },
        returningSchema: NumberIdSchema,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().insertAndReturnOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the insert itself rejects", async () => {
      const result = await records.insertAndReturnOne({
        values: {} as never,
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("parses the returned row again in _runAndReturnOne (schema transform runs twice)", async () => {
      const result = await records.insertAndReturnOne({
        values: { name: "alpha" },
        returningSchema: BumpVersionSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.version).toBe(2);
    });
  });

  describe("DbRecords._insertAndSelect", () => {
    test("merges the primary key into the inserted values", async () => {
      await records.insertAndSelect({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(await allRows()).toEqual([{ id: ROW_ID_1, name: "alpha", version: 0 }]);
    });

    test("returns every row from the follow-up select, parsed", async () => {
      const result = await records.insertAndSelect({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result).toEqual({
        status: "success",
        result: [{ id: ROW_ID_1, name: "alpha", version: 0 }],
      });
    });

    test("reads the row back by primary key", async () => {
      await seed([{ name: "decoy" }]);

      const result = await records.insertAndSelect({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toEqual([{ id: ROW_ID_1, name: "alpha", version: 0 }]);
    });

    test("returns a success Result with an empty array when the read-back finds nothing", async () => {
      const result = await records.insertAndSelect({
        values: { name: "alpha", owner: INTRUDER_ID },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("errors when a read-back row does not match the schema", async () => {
      const result = await records.insertAndSelect({
        values: { name: "alpha" },
        returningSchema: NumberIdSchema,
        id: ROW_ID_1,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when a statement rejects", async () => {
      await records.insertAndSelect({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      const result = await records.insertAndSelect({
        values: { name: "beta" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().insertAndSelect({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecords._insertAndSelectOne", () => {
    test("returns the single read-back row, parsed", async () => {
      const result = await records.insertAndSelectOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result).toEqual({
        status: "success",
        result: { id: ROW_ID_1, name: "alpha", version: 0 },
      });
    });

    test("errors with InvalidArrayLengthError when the read-back finds nothing", async () => {
      const result = await records.insertAndSelectOne({
        values: { name: "alpha", owner: INTRUDER_ID },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("merges the primary key into the inserted values", async () => {
      await records.insertAndSelectOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(await allRows()).toEqual([{ id: ROW_ID_1, name: "alpha", version: 0 }]);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().insertAndSelectOne({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
        id: ROW_ID_1,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecords._updateAndReturnOne", () => {
    test("returns the single updated row, parsed through the returning schema", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOne({
        pKey: row.id,
        values: { name: "beta", version: 5 },
        returningSchema: WidgetSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toEqual({ id: row.id, name: "beta", version: 5 });
    });

    test("forwards the caller's values to the update set", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      await records.updateAndReturnOne({
        pKey: row.id,
        values: { name: "beta", version: 7 },
        returningSchema: WidgetSchema,
      });

      expect(await allRows()).toEqual([{ id: row.id, name: "beta", version: 7 }]);
    });

    test("builds an equality filter on the primary-key column", async () => {
      const [alpha, beta] = await seed([{ name: "alpha" }, { name: "beta" }]);
      assertNonNullish(alpha);
      assertNonNullish(beta);

      await records.updateAndReturnOne({
        pKey: alpha.id,
        values: { name: "renamed", version: 0 },
        returningSchema: WidgetSchema,
      });

      expect(namesOf(await allRows())).toEqual(["beta", "renamed"]);
    });

    test("errors with InvalidArrayLengthError when the update matches no rows", async () => {
      const result = await records.updateAndReturnOne({
        pKey: MISSING_ID,
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

      const result = await records.updateAndReturnOne({
        pKey: row.id,
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
      const result = await unreachableRecords().updateAndReturnOne({
        pKey: MISSING_ID,
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the update itself rejects", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOne({
        pKey: row.id,
        values: { name: null, version: 0 } as never,
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbRecords._updateAndReturnOneBy", () => {
    test("passes the caller's where clause straight through", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await records.updateAndReturnOneBy({
        values: { name: "renamed", version: 0 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("renamed");
      expect(namesOf(await allRows())).toEqual(["beta", "renamed"]);
    });

    test("forwards the caller's values to the update set", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      await records.updateAndReturnOneBy({
        values: { name: "beta", version: 9 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
      });

      expect(await allRows()).toEqual([{ id: row.id, name: "beta", version: 9 }]);
    });

    test("returns the single updated row, parsed", async () => {
      const [row] = await seed([{ name: "alpha" }]);
      assertNonNullish(row);

      const result = await records.updateAndReturnOneBy({
        values: { name: "beta", version: 0 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
      });

      expect(result).toEqual({
        status: "success",
        result: { id: row.id, name: "beta", version: 0 },
      });
    });

    test("errors with InvalidArrayLengthError when no rows match", async () => {
      const result = await records.updateAndReturnOneBy({
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError when more than one row matches", async () => {
      await seed([{ name: "dup" }, { name: "dup" }]);

      const result = await records.updateAndReturnOneBy({
        values: { name: "beta", version: 0 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "dup"),
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().updateAndReturnOneBy({
        values: { name: "beta", version: 3 },
        returningSchema: WidgetSchema,
        where: eq(widgets.name, "alpha"),
      });

      expect(result.status).toBe("error");
    });
  });
});
