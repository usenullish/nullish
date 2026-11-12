import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import {
  BankMovementStatus,
  DbSchema,
  type PostgresDbInstance,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { loadCallerMiddleware } from "../../../src/api/middlewares/caller";
import { BankMovementsIgnoreHandlers } from "../../../src/api/resources/_bank-movements+ignore";
import {
  createBankRelation,
  createBankStatement,
  createOrganization,
  randomDedupeHash,
  resetDb,
} from "../../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

const movements = DbSchema.Banking.Movements.MovementsSchema;

describe("bank movements ignore", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  let userId: string;
  let cookie: string;
  let organizationId: string;
  let bankRelationId: string;
  let statementId: string;

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
    method = "GET",
    body,
    cookie: sessionCookie,
    authorization,
  }: {
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
    cookie?: string;
    authorization?: string;
  }): Promise<Response> => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail: null }));
    app.use("*", loadCallerMiddleware());

    const resource = BankMovementsIgnoreHandlers.create({ app });
    resource.useCustomMiddleware();
    resource.register();

    return await app.request(path, {
      method,
      headers: {
        ...(nonNullish(sessionCookie) && { Cookie: sessionCookie }),
        ...(nonNullish(authorization) && { Authorization: authorization }),
        ...(nonNullish(body) && { "Content-Type": "application/json" }),
      },
      ...(nonNullish(body) && { body: JSON.stringify(body) }),
    });
  };

  const createMovement = async ({
    amount = 1000n,
    creditorReference = null,
  }: {
    amount?: bigint;
    creditorReference?: string | null;
  }): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount,
        currency: "CHF",
        creditorReference,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
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

    const user = await signUp({ email: "bank-movements-ignore@test.local" });
    userId = user.id;
    cookie = user.cookie;

    organizationId = await createOrganization(db, userId);
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE auth.apikeys;`);
    await resetDb(db);
    await instance.close();
  });

  const ignore = ({
    movementId,
    cookie: sessionCookie,
    authorization,
  }: {
    movementId: string;
    cookie?: string;
    authorization?: string;
  }) =>
    request({
      path: `/banking/movements/${movementId}/ignore`,
      method: "POST",
      cookie: sessionCookie,
      authorization,
    });

  test("answers 401 without a session", async () => {
    const movementId = await createMovement({});

    const response = await ignore({ movementId });

    expect(response.status).toBe(401);
  });

  test("ignores a movement", async () => {
    const movementId = await createMovement({});

    const response = await ignore({ movementId, cookie });

    expect(response.status).toBe(200);
    const { bankMovement } = ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema.parse(
      await response.json(),
    );
    expect(bankMovement.id).toBe(movementId);
    expect(bankMovement.status).toBe(BankMovementStatus.IGNORED);
  });

  test("answers 422 with the reason to a movement already ignored", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const movementId = await createMovement({});
      await ignore({ movementId, cookie });

      const response = await ignore({ movementId, cookie });

      expect(response.status).toBe(422);
      const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
      expect(error.code).toBe(ErrorCode.REJECTED);
      expect(error.error).toContain("is ignored and cannot be reconciled");
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  describe("with an api key", () => {
    const createKey = async ({
      permissions,
    }: {
      permissions: Partial<Record<ApiKeyResource, ApiKeyAction[]>>;
    }) => {
      const { key } = await auth.api.createApiKey({
        body: { userId, name: "Ignore", permissions },
      });

      return key;
    };

    test("answers 401 to a key with only the api read permission", async () => {
      const movementId = await createMovement({});
      const key = await createKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] } });

      const response = await ignore({ movementId, authorization: `Bearer ${key}` });

      expect(response.status).toBe(401);
    });

    test("ignores a movement with a key with the api read and write permissions", async () => {
      const movementId = await createMovement({});
      const key = await createKey({
        permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
      });

      const response = await ignore({ movementId, authorization: `Bearer ${key}` });

      expect(response.status).toBe(200);
      const { bankMovement } = ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema.parse(
        await response.json(),
      );
      expect(bankMovement.status).toBe(BankMovementStatus.IGNORED);
    });
  });
});
