import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { sql } from "drizzle-orm";
import { ilikeContains } from "../../src/_query/helpers";
import { type AnyPgColumn, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import type { Result } from "@usenullish/nullish-common";
import { DbCollectionRecordsById } from "../../src/_records/collection-records-by-id";
import type { DbRecordsFilters, DbRecordsSortField } from "../../src/_records/records";
import type { QueryArgs } from "@usenullish/nullish-schema/db";
import type { DbCollectionStoreInitArgs } from "../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";

const widgets = pgTable("test_engine_parent_records_by_id_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id").notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(0),
  owner: text("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const foreign = pgTable("test_engine_parent_records_by_id_foreign", {
  ref: uuid("ref"),
});

const WidgetSchema = z.object({
  id: z.string(),
  bucketId: z.string(),
  name: z.string(),
  version: z.number(),
});
type Widget = z.infer<typeof WidgetSchema>;

const USER_ID =
  "user-00000000-0000-4000-8000-000000000000" as DbCollectionStoreInitArgs<string>["userId"];
const INTRUDER_ID =
  "user-11111111-1111-4111-8111-111111111111" as DbCollectionStoreInitArgs<string>["userId"];

const PAGE = { limit: 100, offset: 0 };
const SORT = { field: "createdAt", direction: "asc" } as const;

const FOREIGN_KEY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_FOREIGN_KEY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const WidgetFiltersSchema = z.strictObject({
  search: z.string().optional(),
});
type WidgetFilters = z.infer<typeof WidgetFiltersSchema>;

const widgetFilters = (values: WidgetFilters): DbRecordsFilters<WidgetFilters> => ({
  values,
  schema: WidgetFiltersSchema,
  where: ({ search }) =>
    search === undefined ? undefined : ilikeContains({ column: widgets.name, value: search }),
});

class TestParentRecordsById extends DbCollectionRecordsById<typeof widgets, string> {
  constructor(
    args: DbCollectionStoreInitArgs<string>,
    foreignKeyColumn: AnyPgColumn = widgets.bucketId,
  ) {
    super({ ...args, table: widgets, foreignKeyColumn });
  }

  queryWithParentId<T, TFilters = never>(
    args: { schema: z.ZodType<T>; filters?: DbRecordsFilters<TFilters> } & QueryArgs<
      DbRecordsSortField<typeof widgets>
    >,
  ): Promise<Result<T[]>> {
    return this._queryWithForeignKeyId(args);
  }

  queryAllWithParentId<T>(
    args: { schema: z.ZodType<T> } & Omit<
      QueryArgs<DbRecordsSortField<typeof widgets>>,
      "pagination"
    >,
  ): Promise<Result<T[]>> {
    return this._queryAllWithForeignKeyId(args);
  }

  insertWithParentId<T>(args: {
    values: Record<string, unknown>;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return this.__insertWithForeignKeyId(args);
  }
}

const records = new TestParentRecordsById({
  db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
  userId: USER_ID,
  foreignKeyId: FOREIGN_KEY_ID,
});

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";
const unreachableRecords = (): TestParentRecordsById =>
  new TestParentRecordsById({
    db: drizzle({
      client: new BunSQL(UNREACHABLE_URL),
    }) as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: USER_ID,
    foreignKeyId: FOREIGN_KEY_ID,
  });

const seed = async (
  rows: { name: string; bucketId?: string; version?: number; owner?: string | null }[],
): Promise<Widget[]> => {
  const inserted = await db
    .insert(widgets)
    .values(rows.map((row) => ({ bucketId: FOREIGN_KEY_ID, ...row })))
    .returning();
  return inserted.map((row) => WidgetSchema.parse(row));
};

const allRows = async (): Promise<Widget[]> => {
  const rows = await db.select().from(widgets);
  return rows.map((row) => WidgetSchema.parse(row));
};

const namesOf = (rows: readonly Widget[]): string[] => rows.map((row) => row.name).sort();

describe("collection-records-by-id", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_parent_records_by_id_widgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id UUID NOT NULL,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      owner TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
  `);

    await db.execute(sql`GRANT USAGE ON SCHEMA public TO authenticated_user;`);
    await db.execute(
      sql`GRANT SELECT, INSERT, UPDATE, DELETE ON test_engine_parent_records_by_id_widgets TO authenticated_user;`,
    );

    await db.execute(
      sql`ALTER TABLE test_engine_parent_records_by_id_widgets ENABLE ROW LEVEL SECURITY;`,
    );
    await db.execute(
      sql`DROP POLICY IF EXISTS owner_scope ON test_engine_parent_records_by_id_widgets;`,
    );
    await db.execute(sql`
    CREATE POLICY owner_scope ON test_engine_parent_records_by_id_widgets
      FOR ALL
      USING (owner IS NULL OR owner = auth.current_user_id())
      WITH CHECK (true);
  `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_parent_records_by_id_widgets;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_engine_parent_records_by_id_widgets CASCADE;`);
  });

  describe("DbParentRecordsById._queryWithForeignKeyId", () => {
    test("returns every row whose parent column matches the store's parent id, parsed", async () => {
      await seed([
        { name: "alpha", bucketId: FOREIGN_KEY_ID },
        { name: "beta", bucketId: FOREIGN_KEY_ID },
        { name: "elsewhere", bucketId: OTHER_FOREIGN_KEY_ID },
      ]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("returns a success Result with an empty array when the parent has no rows", async () => {
      await seed([{ name: "elsewhere", bucketId: OTHER_FOREIGN_KEY_ID }]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
      });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("still excludes rows hidden by the auth scope", async () => {
      await seed([
        { name: "mine", bucketId: FOREIGN_KEY_ID, owner: USER_ID },
        { name: "theirs", bucketId: FOREIGN_KEY_ID, owner: INTRUDER_ID },
        { name: "shared", bucketId: FOREIGN_KEY_ID, owner: null },
      ]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["mine", "shared"]);
    });

    test("paginates and sorts within the parent scope only", async () => {
      await seed([
        { name: "gamma", bucketId: FOREIGN_KEY_ID },
        { name: "alpha", bucketId: FOREIGN_KEY_ID },
        { name: "beta", bucketId: FOREIGN_KEY_ID },
        { name: "aaa-elsewhere", bucketId: OTHER_FOREIGN_KEY_ID },
      ]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: { limit: 2, offset: 1 },
        sort: { field: "name", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ name }) => name)).toEqual(["beta", "gamma"]);
    });

    test("combines the filters with the parent scope", async () => {
      await seed([
        { name: "alpha", bucketId: FOREIGN_KEY_ID },
        { name: "beta", bucketId: FOREIGN_KEY_ID },
        { name: "alpha-elsewhere", bucketId: OTHER_FOREIGN_KEY_ID },
      ]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
        filters: widgetFilters({ search: "alpha" }),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha"]);
    });

    test("returns every row of the parent when no filter is set", async () => {
      await seed([
        { name: "alpha", bucketId: FOREIGN_KEY_ID },
        { name: "beta", bucketId: FOREIGN_KEY_ID },
        { name: "alpha-elsewhere", bucketId: OTHER_FOREIGN_KEY_ID },
      ]);

      const result = await records.queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
        filters: widgetFilters({}),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["alpha", "beta"]);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().queryWithParentId({
        schema: WidgetSchema,
        pagination: PAGE,
        sort: SORT,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("DbParentRecordsById._queryAllWithForeignKeyId", () => {
    test("returns every row of the parent across pages", async () => {
      await seed(Array.from({ length: 1001 }, (_, i) => ({ name: `w-${i}` })));
      await seed([{ name: "other", bucketId: OTHER_FOREIGN_KEY_ID }]);

      const result = await records.queryAllWithParentId({ schema: WidgetSchema, sort: SORT });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1001);
      expect(result.result.every(({ bucketId }) => bucketId === FOREIGN_KEY_ID)).toBeTrue();
    });
  });

  describe("DbParentRecordsById.__insertWithForeignKeyId", () => {
    test("stamps the store's parent id onto the inserted row", async () => {
      const result = await records.insertWithParentId({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.bucketId).toBe(FOREIGN_KEY_ID);
      expect(result.result.name).toBe("alpha");
      expect(result.result.version).toBe(0);
      expect(result.result.id).toBeDefined();
    });

    test("forwards the caller's other values verbatim", async () => {
      await records.insertWithParentId({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      const rows = await allRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("alpha");
      expect(rows[0]?.bucketId).toBe(FOREIGN_KEY_ID);
      expect(rows[0]?.version).toBe(0);
    });

    test("overrides a caller-supplied parent column value with the store's parent id", async () => {
      await records.insertWithParentId({
        values: { name: "alpha", bucketId: OTHER_FOREIGN_KEY_ID },
        returningSchema: WidgetSchema,
      });

      const rows = await allRows();
      expect(rows[0]?.bucketId).toBe(FOREIGN_KEY_ID);
    });

    test("returns an error Result when the insert itself rejects", async () => {
      const result = await records.insertWithParentId({
        values: {},
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableRecords().insertWithParentId({
        values: { name: "alpha" },
        returningSchema: WidgetSchema,
      });

      expect(result.status).toBe("error");
    });

    test("throws when the parent column does not belong to the table", () => {
      const misconfigured = new TestParentRecordsById(
        {
          db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
          userId: USER_ID,
          foreignKeyId: FOREIGN_KEY_ID,
        },
        foreign.ref,
      );

      expect(() =>
        misconfigured.insertWithParentId({
          values: { name: "alpha" },
          returningSchema: WidgetSchema,
        }),
      ).toThrow();
    });
  });
});
