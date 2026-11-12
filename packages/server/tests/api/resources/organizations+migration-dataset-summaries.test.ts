import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import {
  DbSchema,
  MigrationDatasetType,
  MigrationStatus,
  type PostgresDbInstance,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { MigrationDatasetSummariesHandlers } from "../../../src/api/resources/_organizations+migration-dataset-summaries";
import { createMigration, createOrganization, resetDb } from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const datasets = DbSchema.Migration.Datasets.DatasetsSchema;
const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

describe("organization migration dataset summaries", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let outsiderCookie: string;
  let organizationId: string;
  let succeededMigrationId: string;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const list = async ({ cookie: sessionCookie }: { cookie?: string }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    MigrationDatasetSummariesHandlers.create({ app }).register();

    return await app.request(
      `/organizations/${organizationId}/migration-dataset-summaries?limit=100&offset=0&sort=createdAt&direction=asc&type=journal&status=succeeded`,
      { headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) } },
    );
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

    await resetDb(db);

    const user = await signUp({ email: "migration-dataset-summaries@test.local" });
    cookie = user.cookie;

    outsiderCookie = (await signUp({ email: "migration-dataset-summaries-outsider@test.local" }))
      .cookie;

    organizationId = await createOrganization(db, user.id);

    succeededMigrationId = await createMigration(db, organizationId, user.id);
    await db.insert(datasets).values([
      {
        organizationId,
        migrationId: succeededMigrationId,
        type: MigrationDatasetType.JOURNAL,
        name: "journal-2021.csv",
        data: [],
      },
      {
        organizationId,
        migrationId: succeededMigrationId,
        type: MigrationDatasetType.CLIENTS,
        name: "clients.csv",
        data: [],
      },
    ]);
    await db
      .update(migrations)
      .set({ status: MigrationStatus.SUCCEEDED })
      .where(eq(migrations.id, succeededMigrationId));

    const draftMigrationId = await createMigration(db, organizationId, user.id);
    await db.insert(datasets).values({
      organizationId,
      migrationId: draftMigrationId,
      type: MigrationDatasetType.JOURNAL,
      name: "journal-2022.csv",
      data: [],
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await list({});

    expect(response.status).toBe(401);
  });

  test("lists the journal files of the succeeded migrations with their migration", async () => {
    const response = await list({ cookie });

    expect(response.status).toBe(200);

    const { datasetSummaries } =
      ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema.parse(
        await response.json(),
      );

    expect(datasetSummaries.map(({ dataset }) => dataset.name)).toEqual(["journal-2021.csv"]);
    expect(datasetSummaries[0]?.migration.id).toBe(succeededMigrationId);
  });

  test("lists no file to a user outside the organization", async () => {
    const response = await list({ cookie: outsiderCookie });

    expect(response.status).toBe(200);
    expect(
      ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema.parse(
        await response.json(),
      ).datasetSummaries,
    ).toEqual([]);
  });
});
