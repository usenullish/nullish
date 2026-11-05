import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import type { Result } from "@usenullish/nullish-common";
import { DbChildCollectionRecordsById } from "../../src/_records/child-collection-records-by-id";
import type { DbCollectionStoreInitArgs } from "../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";

const parents = pgTable("test_engine_child_records_by_id_parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  owner: text("owner"),
});

const children = pgTable("test_engine_child_records_by_id_children", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const ChildSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  organizationId: z.string(),
  name: z.string(),
});

const USER_ID =
  "user-00000000-0000-4000-8000-000000000000" as DbCollectionStoreInitArgs<string>["userId"];
const INTRUDER_ID =
  "user-11111111-1111-4111-8111-111111111111" as DbCollectionStoreInitArgs<string>["userId"];

const ORGANIZATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ORGANIZATION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_PARENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

class TestChildRecordsById extends DbChildCollectionRecordsById<typeof children, string> {
  constructor(args: DbCollectionStoreInitArgs<string>) {
    super({ ...args, table: children, foreignKeyColumn: children.parentId, parentTable: parents });
  }

  insertWithParentId<T>(args: {
    values: Record<string, unknown>;
    returningSchema: z.ZodType<T>;
  }): Promise<Result<T>> {
    return this.__insertWithForeignKeyId(args);
  }
}

const recordsOf = (parentId: string): TestChildRecordsById =>
  new TestChildRecordsById({
    db: db as unknown as DbCollectionStoreInitArgs<string>["db"],
    userId: USER_ID,
    foreignKeyId: parentId,
  });

const seedParent = async ({
  organizationId,
  owner = null,
}: {
  organizationId: string;
  owner?: string | null;
}): Promise<string> => {
  const [row] = await db.insert(parents).values({ organizationId, owner }).returning();
  return z.string().parse(row?.id);
};

describe("child-collection-records-by-id", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_child_records_by_id_parents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      owner TEXT
    );
  `);
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_child_records_by_id_children (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

    await db.execute(sql`GRANT USAGE ON SCHEMA public TO authenticated_user;`);
    await db.execute(
      sql`GRANT SELECT ON test_engine_child_records_by_id_parents TO authenticated_user;`,
    );
    await db.execute(
      sql`GRANT SELECT, INSERT ON test_engine_child_records_by_id_children TO authenticated_user;`,
    );

    await db.execute(
      sql`ALTER TABLE test_engine_child_records_by_id_parents ENABLE ROW LEVEL SECURITY;`,
    );
    await db.execute(
      sql`DROP POLICY IF EXISTS owner_scope ON test_engine_child_records_by_id_parents;`,
    );
    await db.execute(sql`
    CREATE POLICY owner_scope ON test_engine_child_records_by_id_parents
      FOR SELECT
      USING (owner IS NULL OR owner = auth.current_user_id());
  `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_child_records_by_id_children;`);
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_child_records_by_id_parents;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE test_engine_child_records_by_id_children, test_engine_child_records_by_id_parents;`,
    );
  });

  describe("DbChildCollectionRecordsById.__insertWithForeignKeyId", () => {
    test("stamps the parent id and the organization of the parent onto the inserted row", async () => {
      const parentId = await seedParent({ organizationId: ORGANIZATION_ID });

      const result = await recordsOf(parentId).insertWithParentId({
        values: { name: "alpha" },
        returningSchema: ChildSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.parentId).toBe(parentId);
      expect(result.result.organizationId).toBe(ORGANIZATION_ID);
      expect(result.result.name).toBe("alpha");
    });

    test("overrides a caller-supplied organization with the organization of the parent", async () => {
      const parentId = await seedParent({ organizationId: ORGANIZATION_ID });

      const result = await recordsOf(parentId).insertWithParentId({
        values: { name: "alpha", organizationId: OTHER_ORGANIZATION_ID },
        returningSchema: ChildSchema,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(ORGANIZATION_ID);
    });

    test("returns an error Result when the parent does not exist", async () => {
      const result = await recordsOf(MISSING_PARENT_ID).insertWithParentId({
        values: { name: "alpha" },
        returningSchema: ChildSchema,
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the parent is hidden by the auth scope", async () => {
      const parentId = await seedParent({ organizationId: ORGANIZATION_ID, owner: INTRUDER_ID });

      const result = await recordsOf(parentId).insertWithParentId({
        values: { name: "alpha" },
        returningSchema: ChildSchema,
      });

      expect(result.status).toBe("error");
    });
  });
});
