import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { type StartedJobs, startJobs, type TriggeredJobs } from "@usenullish/nullish-jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { StoragePath } from "@usenullish/nullish-schema/jobs";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl, envDataDir } from "@usenullish/nullish-env";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { loadWorkersMiddleware } from "../../../src/api/middlewares/workers";
import { RATE_LIMITS } from "../../../src/api/middlewares/rate-limit";
import { OrganizationsExportsGenerateHandlers } from "../../../src/api/resources/_organizations+exports+generate";
import { OrganizationsExportsJobsHandlers } from "../../../src/api/resources/_organizations+exports+jobs";
import { OrganizationsExportsDownloadHandlers } from "../../../src/api/resources/_organizations+exports+download";
import { createOrganization, resetDb, waitFor } from "../../../../engine/tests/_test-utils";

describe("organizations exports", () => {
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

  const createApp = (): OpenAPIHono<ApiEnv> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());
    app.use(
      "*",
      loadWorkersMiddleware({
        jobs,
        storage: FsStorageProvider.create(),
        mail: null,
        payments: null,
      }),
    );

    const generateResource = OrganizationsExportsGenerateHandlers.create({ app });
    generateResource.useCustomMiddleware();
    generateResource.register();
    OrganizationsExportsJobsHandlers.create({ app }).register();
    OrganizationsExportsDownloadHandlers.create({ app }).register();

    return app;
  };

  const request = async ({
    path,
    method,
    cookie,
    app = createApp(),
  }: {
    path: string;
    method: "GET" | "POST";
    cookie?: string;
    app?: OpenAPIHono<ApiEnv>;
  }): Promise<Response> =>
    await app.request(path, {
      method,
      headers: { ...(nonNullish(cookie) && { Cookie: cookie }) },
    });

  const generate = ({ id = organizationId, cookie }: { id?: string; cookie?: string }) =>
    request({ path: `/organizations/${id}/exports/generate`, method: "POST", cookie });

  const jobState = ({
    id = organizationId,
    jobId,
    cookie,
  }: {
    id?: string;
    jobId: string;
    cookie?: string;
  }) => request({ path: `/organizations/${id}/exports/jobs/${jobId}`, method: "GET", cookie });

  const download = ({
    id = organizationId,
    exportId,
    cookie,
  }: {
    id?: string;
    exportId: string;
    cookie?: string;
  }) =>
    request({ path: `/organizations/${id}/exports/${exportId}/download`, method: "GET", cookie });

  const exportOf = async ({ cookie }: { cookie: string }): Promise<string> => {
    const response = await generate({ cookie });

    const { jobId } = ApiSchema.Exports.GenerateExportResponseSchema.parse(await response.json());

    const state = await waitFor(
      async () =>
        ApiSchema.Exports.ExportJobStateResponseSchema.parse(
          await (await jobState({ jobId, cookie })).json(),
        ),
      (body) => body.status === "completed",
    );

    if (state.status !== "completed") {
      throw new Error("The export did not complete");
    }

    return state.result.exportId;
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

    owner = await signUp({ email: "exports-owner@test.local" });
    outsider = await signUp({ email: "exports-outsider@test.local" });

    organizationId = await createOrganization(db, owner.id);
  });

  afterAll(async () => {
    await closeJobs();
    await rm(join(envDataDir(), StoragePath.Organizations, organizationId), {
      recursive: true,
      force: true,
    });
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await generate({});

    expect(response.status).toBe(401);
  });

  test("queues the export, which then completes", async () => {
    const response = await generate({ cookie: owner.cookie });

    expect(response.status).toBe(200);

    const { status: queued, jobId } = ApiSchema.Exports.GenerateExportResponseSchema.parse(
      await response.json(),
    );

    expect(queued).toBe("queued");

    const state = await waitFor(
      async () =>
        ApiSchema.Exports.ExportJobStateResponseSchema.parse(
          await (await jobState({ jobId, cookie: owner.cookie })).json(),
        ),
      (body) => body.status === "completed",
    );

    expect(state).toEqual({ status: "completed", result: { exportId: expect.any(String) } });
  }, 15000);

  test("downloads the archive of the export", async () => {
    const exportId = await exportOf({ cookie: owner.cookie });

    const response = await download({ exportId, cookie: owner.cookie });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/gzip");
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="export-${organizationId}.tar.gz"`,
    );

    const files = await new Bun.Archive(await response.bytes()).files();

    expect([...files.keys()]).toContain("core/organizations.json");
  }, 15000);

  test("refuses to export an organization the user is not a member of", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const response = await generate({ cookie: outsider.cookie });

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("refuses the job state to a user who is not a member of the organization", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const started = await generate({ cookie: owner.cookie });
    const { jobId } = ApiSchema.Exports.GenerateExportResponseSchema.parse(await started.json());

    const response = await jobState({ jobId, cookie: outsider.cookie });

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("answers 404 to a user who is not a member of the organization", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const exportId = await exportOf({ cookie: owner.cookie });

    const response = await download({ exportId, cookie: outsider.cookie });

    expect(response.status).toBe(404);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  }, 15000);

  test("answers 404 for an export that does not exist", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const response = await download({ exportId: crypto.randomUUID(), cookie: owner.cookie });

    expect(response.status).toBe(404);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("answers 400 for an invalid organization id", async () => {
    const response = await generate({ id: "not-a-uuid", cookie: owner.cookie });

    expect(response.status).toBe(400);
  });

  test("limits the exports", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const app = createApp();
    const statuses: number[] = [];

    for (const _ of Array.from({ length: RATE_LIMITS.exportsGenerate + 1 })) {
      const response = await request({
        path: `/organizations/${organizationId}/exports/generate`,
        method: "POST",
        cookie: outsider.cookie,
        app,
      });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, RATE_LIMITS.exportsGenerate).every((status) => status === 500)).toBe(
      true,
    );
    expect(statuses.at(-1)).toBe(429);

    consoleError.mockRestore();
  });
});
