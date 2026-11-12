import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { join } from "node:path";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import {
  ApiSchema,
  BANK_STATEMENT_FILE_MAX_SIZE,
  CommonSchema,
  ErrorCode,
} from "@usenullish/nullish-schema/server";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { BankRelationsStatementsImportHandlers } from "../../../src/api/resources/_bank-relations+statements+import";
import {
  createBankRelation,
  createOrganization,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const UBS_IBAN = "CH710023023099999999R";

describe("bank-relations statements import", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let cookie: string;
  let bankRelationId: string;
  let sample: Blob;

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
    accountId = bankRelationId,
    cookie: sessionCookie,
  }: {
    file: Blob;
    accountId?: string;
    cookie?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance }));
    app.use("*", loadCallerMiddleware());

    const resource = BankRelationsStatementsImportHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    const body = new FormData();
    body.append("file", file, "statement.xml");

    return await app.request(`/banking/relations/${accountId}/statements/import`, {
      method: "POST",
      headers: { ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }) },
      body,
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
        signIn: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    await resetDb(db);

    const user = await signUp({ email: "bank-statements@test.local" });
    cookie = user.cookie;

    const organizationId = await createOrganization(db, user.id);
    bankRelationId = await createBankRelation(db, organizationId, { iban: UBS_IBAN });

    sample = Bun.file(join(import.meta.dir, "../../../../engine/fixtures/ubs-camt-053.xml"));
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("answers 401 without a session", async () => {
    const response = await upload({ file: sample });

    expect(response.status).toBe(401);
  });

  test("imports the statements of the file", async () => {
    const response = await upload({ file: sample, cookie });

    expect(response.status).toBe(200);
    expect(
      ApiSchema.BankRelationsStatementsImport.ImportStatementsResponseSchema.parse(
        await response.json(),
      ),
    ).toEqual({
      statements: { processed: 1, ignored: 0 },
      movements: { inserted: 15, existing: 0 },
    });
  });

  test("answers 413 to a file larger than the limit", async () => {
    const response = await upload({
      file: new Blob([new Uint8Array(BANK_STATEMENT_FILE_MAX_SIZE + 1)]),
      cookie,
    });

    expect(response.status).toBe(413);
    expect(CommonSchema.Error.ErrorSchema.parse(await response.json()).code).toBe(
      ErrorCode.LIMITED,
    );
  });

  test("answers 422 with the reason to a file that is not a bank statement", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await upload({ file: new Blob(["<Document/>"]), cookie });

      expect(response.status).toBe(422);
      expect(CommonSchema.Error.ErrorSchema.parse(await response.json()).error).toContain(
        "is not a camt.053 bank statement",
      );
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
