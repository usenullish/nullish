import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import {
  DbSchema,
  MigrationProvider,
  MigrationStatus,
  type PostgresDbInstance,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { MigrationsHandlers } from "../../../src/api/resources/_organizations+migrations";
import { createMigration, createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

const LIST_QUERY = "limit=100&offset=0&sort=createdAt&direction=asc";

describe("organization migrations", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let owner: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };
  let organizationId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const request = async ({
    path,
    method,
    cookie,
    body,
  }: {
    path: string;
    method: "GET" | "POST" | "DELETE";
    cookie?: string;
    body?: unknown;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    MigrationsHandlers.create({ app }).register();

    return await app.request(path, {
      method,
      headers: {
        ...(nonNullish(cookie) && { Cookie: cookie }),
        ...(nonNullish(body) && { "Content-Type": "application/json" }),
      },
      ...(nonNullish(body) && { body: JSON.stringify(body) }),
    });
  };

  const migrationExists = async (id: string): Promise<boolean> => {
    const rows = await db.select().from(migrations).where(eq(migrations.id, id));
    return rows.length === 1;
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;
    auth = createAuth({
      db,
      env: {
        signUp: true,
        autoSignIn: true,
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);

    owner = await signUp({ email: "migrations-owner@test.local" });
    outsider = await signUp({ email: "migrations-outsider@test.local" });

    organizationId = await createOrganization(db, owner.id);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("create", () => {
    test("answers 401 without a session", async () => {
      const response = await request({
        path: `/organizations/${organizationId}/migrations`,
        method: "POST",
        body: { provider: MigrationProvider.BEXIO },
      });

      expect(response.status).toBe(401);
    });

    test("creates a draft migration of the caller", async () => {
      const response = await request({
        path: `/organizations/${organizationId}/migrations`,
        method: "POST",
        cookie: owner.cookie,
        body: { provider: MigrationProvider.BEXIO },
      });

      expect(response.status).toBe(201);

      const { migration } = ApiSchema.Migrations.CreateMigrationResponseSchema.parse(
        await response.json(),
      );

      expect(migration.organizationId).toBe(organizationId);
      expect(migration.userId).toBe(owner.id);
      expect(migration.status).toBe(MigrationStatus.DRAFT);
    });

    test("answers 400 for an unknown provider", async () => {
      const response = await request({
        path: `/organizations/${organizationId}/migrations`,
        method: "POST",
        cookie: owner.cookie,
        body: { provider: "unknown" },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("list", () => {
    test("lists the migrations of the organization", async () => {
      const migrationId = await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/organizations/${organizationId}/migrations?${LIST_QUERY}`,
        method: "GET",
        cookie: owner.cookie,
      });

      expect(response.status).toBe(200);

      const { migrations: listed } = ApiSchema.Migrations.GetMigrationsResponseSchema.parse(
        await response.json(),
      );

      expect(listed.map(({ id }) => id)).toContain(migrationId);
    });

    test("lists no migration to a user outside the organization", async () => {
      await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/organizations/${organizationId}/migrations?${LIST_QUERY}`,
        method: "GET",
        cookie: outsider.cookie,
      });

      expect(response.status).toBe(200);
      expect(
        ApiSchema.Migrations.GetMigrationsResponseSchema.parse(await response.json()).migrations,
      ).toEqual([]);
    });
  });

  describe("get", () => {
    test("returns the migration", async () => {
      const migrationId = await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/migrations/${migrationId}`,
        method: "GET",
        cookie: owner.cookie,
      });

      expect(response.status).toBe(200);
      expect(
        ApiSchema.Migrations.GetMigrationResponseSchema.parse(await response.json()).migration?.id,
      ).toBe(migrationId);
    });

    test("answers 404 to a user outside the organization", async () => {
      const migrationId = await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/migrations/${migrationId}`,
        method: "GET",
        cookie: outsider.cookie,
      });

      expect(response.status).toBe(404);
    });
  });

  describe("delete", () => {
    test("deletes a draft migration", async () => {
      const migrationId = await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/migrations/${migrationId}`,
        method: "DELETE",
        cookie: owner.cookie,
      });

      expect(response.status).toBe(204);
      expect(await migrationExists(migrationId)).toBeFalse();
    });

    test("answers 404 to a user outside the organization", async () => {
      const migrationId = await createMigration(db, organizationId, owner.id);

      const response = await request({
        path: `/migrations/${migrationId}`,
        method: "DELETE",
        cookie: outsider.cookie,
      });

      expect(response.status).toBe(404);
      expect(await migrationExists(migrationId)).toBeTrue();
    });

    test("refuses to delete a migration that is not a draft", async () => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      const migrationId = await createMigration(db, organizationId, owner.id);

      await db
        .update(migrations)
        .set({ status: MigrationStatus.SUCCEEDED })
        .where(eq(migrations.id, migrationId));

      const response = await request({
        path: `/migrations/${migrationId}`,
        method: "DELETE",
        cookie: owner.cookie,
      });

      expect(response.status).toBe(500);
      expect(consoleError).toHaveBeenCalled();
      expect(await migrationExists(migrationId)).toBeTrue();

      consoleError.mockRestore();
    });
  });
});
