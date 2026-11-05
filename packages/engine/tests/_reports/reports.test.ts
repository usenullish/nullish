import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { eq, sql, type SQL } from "drizzle-orm";
import { integer, pgTable, pgView, text, uuid, type SelectedFields } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import type { Result } from "@usenullish/nullish-common";
import { type DbReportArgs, DbReports } from "../../src/_reports/reports";
import { envDbUrl } from "@usenullish/nullish-env";

const widgets = pgTable("test_engine_reports_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(0),
  owner: text("owner"),
});

const widgetsView = pgView("test_engine_reports_widgets_view", {
  id: uuid("id"),
  name: text("name"),
  version: integer("version"),
  owner: text("owner"),
}).existing();

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

const DoubledSchema = z.object({
  id: z.string(),
  doubled: z.number(),
});

const USER_ID = "user-00000000-0000-4000-8000-000000000000" as DbReportArgs["userId"];
const INTRUDER_ID = "user-11111111-1111-4111-8111-111111111111" as DbReportArgs["userId"];

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

class TestReports extends DbReports<typeof widgetsView> {
  constructor(args: DbReportArgs) {
    super({ ...args, view: widgetsView });
  }

  get view(): typeof widgetsView {
    return this._view;
  }

  query<T, Selection extends SelectedFields>(args: {
    schema: z.ZodType<T>;
    where?: SQL;
    selection?: Selection;
  }): Promise<Result<T[]>> {
    return this._query(args);
  }
}

const reports = new TestReports({
  db: db as unknown as DbReportArgs["db"],
  userId: USER_ID,
});

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";
const unreachableReports = (): TestReports =>
  new TestReports({
    db: drizzle({ client: new BunSQL(UNREACHABLE_URL) }) as unknown as DbReportArgs["db"],
    userId: USER_ID,
  });

const seed = async (
  rows: { name: string; version?: number; owner?: string | null }[],
): Promise<Widget[]> => {
  const inserted = await db.insert(widgets).values(rows).returning();
  return inserted.map((row) => WidgetSchema.parse(row));
};

const namesOf = (rows: readonly Widget[]): string[] => rows.map((row) => row.name).sort();

describe("_reports", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_reports_widgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      owner TEXT
      );
  `);

    await db.execute(sql`DROP VIEW IF EXISTS test_engine_reports_widgets_view;`);
    await db.execute(sql`
    CREATE VIEW test_engine_reports_widgets_view AS
      SELECT id, name, version, owner
      FROM test_engine_reports_widgets
      WHERE owner IS NULL OR owner = auth.current_user_id();
  `);

    await db.execute(sql`GRANT USAGE ON SCHEMA public TO authenticated_user;`);
    await db.execute(sql`GRANT SELECT ON test_engine_reports_widgets_view TO authenticated_user;`);
  });

  afterAll(async () => {
    await db.execute(sql`DROP VIEW IF EXISTS test_engine_reports_widgets_view;`);
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_reports_widgets;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_engine_reports_widgets CASCADE;`);
  });

  describe("DbReports._view", () => {
    test("exposes the view the store was constructed with", () => {
      expect(reports.view).toBe(widgetsView);
    });
  });

  describe("DbReports._query", () => {
    test("returns a success Result wrapping every row, parsed through the schema", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await reports.query({ schema: WidgetSchema });

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

      const result = await reports.query({ schema: BumpVersionSchema });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((r) => r.version).sort()).toEqual([2, 6]);
    });

    test("threads the where clause into the query builder", async () => {
      await seed([{ name: "alpha" }, { name: "beta" }]);

      const result = await reports.query({
        schema: WidgetSchema,
        where: eq(widgetsView.name, "alpha"),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.name).toBe("alpha");
    });

    test("returns a success Result with an empty array when there are no rows", async () => {
      const result = await reports.query({ schema: WidgetSchema });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns an error Result (not a throw) when a row fails schema validation", async () => {
      await seed([{ name: "alpha" }]);

      const result = await reports.query({ schema: NumberIdSchema });

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
      const result = await reports.query({ schema: ShortName });

      expect(result.status).toBe("error");
    });

    test("restricts the selected columns to the caller's selection", async () => {
      const [row] = await seed([{ name: "alpha", version: 4 }]);
      assertNonNullish(row);

      const result = await reports.query({
        schema: DoubledSchema,
        selection: {
          id: widgetsView.id,
          doubled: sql<number>`${widgetsView.version} * 2`.as("doubled"),
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toEqual([{ id: row.id, doubled: 8 }]);
    });

    test("scopes reads to the store's user id via the auth-scoped transaction", async () => {
      await seed([
        { name: "mine", owner: USER_ID },
        { name: "theirs", owner: INTRUDER_ID },
        { name: "shared", owner: null },
      ]);

      const result = await reports.query({ schema: WidgetSchema });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["mine", "shared"]);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableReports().query({ schema: WidgetSchema });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the underlying select rejects", async () => {
      const result = await reports.query({
        schema: WidgetSchema,
        where: sql`name > 42`,
      });

      expect(result.status).toBe("error");
    });
  });
});
