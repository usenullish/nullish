import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  MIGRATION_DATASET_FILE_MAX_SIZE,
} from "@usenullish/nullish-schema/server";
import { MigrationDatasetType, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { MigrationsDatasetsHandlers } from "../../../src/api/resources/_migrations+datasets";
import { RATE_LIMITS } from "../../../src/api/middlewares/rate-limit";
import {
  bexioClientsCsv,
  createMigration,
  createOrganization,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

describe("migrations datasets upload", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let outsiderCookie: string;
  let migrationId: string;

  const clients = new Blob([bexioClientsCsv([{ type: "Firma", name: "Muster AG" }])]);

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const upload = async ({
    file,
    type = MigrationDatasetType.CLIENTS,
    cookie: sessionCookie,
  }: {
    file: Blob;
    type?: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    const resource = MigrationsDatasetsHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    const body = new FormData();
    body.append("file", file, "clients.csv");
    body.append("type", type);

    return await app.request(`/migrations/${migrationId}/datasets`, {
      method: "POST",
      headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) },
      body,
    });
  };

  const replace = async ({
    id,
    file,
    type = MigrationDatasetType.CLIENTS,
    cookie: sessionCookie,
  }: {
    id: string;
    file: Blob;
    type?: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    const resource = MigrationsDatasetsHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    const body = new FormData();
    body.append("file", file, "clients-2.csv");
    body.append("type", type);

    return await app.request(`/migrations/${migrationId}/datasets/${id}/replace`, {
      method: "POST",
      headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) },
      body,
    });
  };

  const list = async ({ cookie: sessionCookie }: { cookie?: string }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    MigrationsDatasetsHandlers.create({ app }).register();

    return await app.request(
      `/migrations/${migrationId}/datasets?limit=100&offset=0&sort=createdAt&direction=asc`,
      { headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) } },
    );
  };

  const remove = async ({
    id,
    cookie: sessionCookie,
  }: {
    id: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    MigrationsDatasetsHandlers.create({ app }).register();

    return await app.request(`/migrations/datasets/${id}`, {
      method: "DELETE",
      headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) },
    });
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

    const user = await signUp({ email: "migration-datasets@test.local" });
    cookie = user.cookie;

    outsiderCookie = (await signUp({ email: "migration-datasets-outsider@test.local" })).cookie;

    const organizationId = await createOrganization(db, user.id);
    migrationId = await createMigration(db, organizationId, user.id);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await upload({ file: clients });

    expect(response.status).toBe(401);
  });

  test("stores the dataset read from the file", async () => {
    const response = await upload({ file: clients, cookie });

    expect(response.status).toBe(200);

    const { dataset } = ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema.parse(
      await response.json(),
    );

    expect(dataset.type).toBe(MigrationDatasetType.CLIENTS);
    expect(dataset.name).toBe("clients.csv");
  });

  test("lists the uploaded datasets without their data", async () => {
    const response = await list({ cookie });

    expect(response.status).toBe(200);

    const { datasets } = ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(
      await response.json(),
    );

    expect(datasets.map(({ name }) => name)).toContain("clients.csv");
    expect(datasets[0]).not.toHaveProperty("data");
  });

  test("lists no dataset to a user outside the organization", async () => {
    const response = await list({ cookie: outsiderCookie });

    expect(response.status).toBe(200);
    expect(
      ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(await response.json()).datasets,
    ).toEqual([]);
  });

  test("answers 400 to balances without their date", async () => {
    const response = await upload({ file: clients, type: MigrationDatasetType.BALANCES, cookie });

    expect(response.status).toBe(400);
  });

  test("answers 400 to an unknown type", async () => {
    const response = await upload({ file: clients, type: "unknown", cookie });

    expect(response.status).toBe(400);
  });

  test("answers 413 to a file larger than the limit", async () => {
    const response = await upload({
      file: new Blob([new Uint8Array(MIGRATION_DATASET_FILE_MAX_SIZE + 1)]),
      cookie,
    });

    expect(response.status).toBe(413);
    expect(CommonSchema.Error.ErrorSchema.parse(await response.json()).code).toBe(
      ErrorCode.LIMITED,
    );
  });

  test("answers 422 with the reason to a file that cannot be read as the type", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await upload({
        file: new Blob(["not a csv"]),
        type: MigrationDatasetType.ACCOUNTS,
        cookie,
      });

      expect(response.status).toBe(422);
      expect(CommonSchema.Error.ErrorSchema.parse(await response.json()).error).toContain(
        "could not be read as accounts",
      );
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test("replaces the file of a dataset of the draft migration", async () => {
    const { datasets } = ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(
      await (await list({ cookie })).json(),
    );
    const [dataset] = datasets;
    assertNonNullish(dataset);

    const response = await replace({ id: dataset.id, file: clients, cookie });

    expect(response.status).toBe(200);

    const { dataset: replaced } = ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema.parse(
      await response.json(),
    );

    expect(replaced.id).toBe(dataset.id);
    expect(replaced.name).toBe("clients-2.csv");
  });

  test("answers 422 when replacing a dataset by a file of another type", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const { datasets } = ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(
      await (await list({ cookie })).json(),
    );
    const [dataset] = datasets;
    assertNonNullish(dataset);

    const response = await replace({
      id: dataset.id,
      file: clients,
      type: MigrationDatasetType.ACCOUNTS,
      cookie,
    });

    expect(response.status).toBe(422);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("deletes a dataset of the draft migration", async () => {
    const { datasets } = ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema.parse(
      await (await list({ cookie })).json(),
    );
    const [dataset] = datasets;
    assertNonNullish(dataset);

    const outsiderResponse = await remove({ id: dataset.id, cookie: outsiderCookie });

    expect(outsiderResponse.status).toBe(404);

    const response = await remove({ id: dataset.id, cookie });

    expect(response.status).toBe(204);
  });

  describe("rate limit", () => {
    const createApp = (): OpenAPIHono<ApiEnv> => {
      const app = new OpenAPIHono<ApiEnv>();

      app.use("*", loadDbMiddleware({ db: instance }));
      app.use("*", loadAuthMiddleware({ db: instance }));
      app.use("*", loadCallerMiddleware());

      const resource = MigrationsDatasetsHandlers.create({ app });
      resource.useCustomMiddleware();
      resource.register();

      return app;
    };

    const requestTimes = async ({
      times,
      request,
    }: {
      times: number;
      request: () => Response | Promise<Response>;
    }): Promise<number[]> => {
      const statuses: number[] = [];

      for (const _ of Array.from({ length: times })) {
        statuses.push((await request()).status);
      }

      return statuses;
    };

    test("does not limit listing the datasets", async () => {
      const app = createApp();

      const statuses = await requestTimes({
        times: RATE_LIMITS.datasetsUpload + 1,
        request: () =>
          app.request(
            `/migrations/${migrationId}/datasets?limit=100&offset=0&sort=createdAt&direction=asc`,
            { headers: { Cookie: cookie } },
          ),
      });

      expect(statuses.every((status) => status === 200)).toBeTrue();
    });

    test("limits the uploads", async () => {
      const app = createApp();

      const statuses = await requestTimes({
        times: RATE_LIMITS.datasetsUpload + 1,
        request: () => {
          const body = new FormData();
          body.append("file", clients, "clients.csv");
          body.append("type", "unknown");

          return app.request(`/migrations/${migrationId}/datasets`, {
            method: "POST",
            headers: { Cookie: cookie },
            body,
          });
        },
      });

      expect(
        statuses.slice(0, RATE_LIMITS.datasetsUpload).every((status) => status === 400),
      ).toBeTrue();
      expect(statuses.at(-1)).toBe(429);
    });
  });
});
