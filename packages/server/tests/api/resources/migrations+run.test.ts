import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { type StartedJobs, startJobs, type TriggeredJobs } from "@usenullish/nullish-jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { DbSchema, MigrationStatus, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { loadWorkersMiddleware } from "../../../src/api/middlewares/workers";
import { MigrationsRunHandlers } from "../../../src/api/resources/_migrations+run";
import { MigrationsRunJobsHandlers } from "../../../src/api/resources/_migrations+run+jobs";
import {
  createMigration,
  createOrganization,
  resetDb,
  waitFor,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

describe("migrations run", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;
  let jobs: TriggeredJobs;
  let closeJobs: StartedJobs["close"];

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
  }: {
    path: string;
    method: "GET" | "POST";
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());
    app.use("*", loadWorkersMiddleware({ jobs, storage: FsStorageProvider.create() }));

    MigrationsRunHandlers.create({ app }).register();
    MigrationsRunJobsHandlers.create({ app }).register();

    return await app.request(path, {
      method,
      headers: { ...(nonNullish(cookie) && { Cookie: cookie }) },
    });
  };

  const run = ({ migrationId, cookie }: { migrationId: string; cookie?: string }) =>
    request({ path: `/migrations/${migrationId}/run`, method: "POST", cookie });

  const jobState = ({
    migrationId,
    jobId,
    cookie,
  }: {
    migrationId: string;
    jobId: string;
    cookie?: string;
  }) => request({ path: `/migrations/${migrationId}/run/jobs/${jobId}`, method: "GET", cookie });

  const statusOf = async (migrationId: string): Promise<MigrationStatus | undefined> => {
    const [row] = await db.select().from(migrations).where(eq(migrations.id, migrationId));
    return row?.status;
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
        emailAndPassword: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    const started = await startJobs();

    if (started.status === "error") {
      throw started.err;
    }

    jobs = started.result.triggered;
    closeJobs = started.result.close;

    await resetDb(db);

    owner = await signUp({ email: "migrations-run-owner@test.local" });
    outsider = await signUp({ email: "migrations-run-outsider@test.local" });

    organizationId = await createOrganization(db, owner.id);
  });

  afterAll(async () => {
    await closeJobs();
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const migrationId = await createMigration(db, organizationId, owner.id);

    const response = await run({ migrationId });

    expect(response.status).toBe(401);
  });

  test("queues the migration, which then runs", async () => {
    const migrationId = await createMigration(db, organizationId, owner.id);

    const response = await run({ migrationId, cookie: owner.cookie });

    expect(response.status).toBe(200);

    const { status: queued, jobId } = ApiSchema.MigrationsRun.RunMigrationResponseSchema.parse(
      await response.json(),
    );

    expect(queued).toBe("queued");

    const state = await waitFor(
      async () =>
        ApiSchema.MigrationsRun.RunMigrationJobStateResponseSchema.parse(
          await (await jobState({ migrationId, jobId, cookie: owner.cookie })).json(),
        ),
      (body) => body.status === "completed",
    );

    expect(state.status).toBe("completed");
    expect(await statusOf(migrationId)).toBe(MigrationStatus.SUCCEEDED);
  }, 15000);

  test("answers 422 for a migration that already succeeded", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const migrationId = await createMigration(db, organizationId, owner.id);

    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, migrationId));

    const response = await run({ migrationId, cookie: owner.cookie });

    expect(response.status).toBe(422);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("refuses a migration of another organization", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const migrationId = await createMigration(db, organizationId, owner.id);

    const response = await run({ migrationId, cookie: outsider.cookie });

    expect(response.status).toBe(500);
    expect(await statusOf(migrationId)).toBe(MigrationStatus.DRAFT);

    consoleError.mockRestore();
  });
});
