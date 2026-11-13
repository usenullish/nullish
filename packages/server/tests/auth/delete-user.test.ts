import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { eq } from "drizzle-orm";
import { createOrganization, resetDb } from "../../../engine/tests/_test-utils";
import { envAuthSecret, envAppUrl } from "@usenullish/nullish-env";

const users = DbSchema.Auth.Auth.users;

const PASSWORD = "password-1234";

describe("delete user", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let auth: ReturnType<typeof createAuth>;

  const signUp = async ({ email }: { email: string }): Promise<{ id: string; cookie: string }> => {
    const { headers, response } = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: email },
      returnHeaders: true,
    });

    const [sessionCookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(sessionCookie);

    return { id: response.user.id, cookie: sessionCookie };
  };

  const deleteUser = ({ cookie, password }: { cookie: string; password: string }) =>
    auth.handler(
      new Request("http://localhost:5173/auth/delete-user", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }),
    );

  const userExists = async (id: string): Promise<boolean> =>
    (await db.select().from(users).where(eq(users.id, id))).length === 1;

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
        baseURL: envAppUrl(),
        secret: envAuthSecret(),
      },
    });
  });

  beforeEach(async () => {
    await resetDb(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("deletes the user with their password", async () => {
    const { id, cookie } = await signUp({ email: "delete-user@test.local" });

    const response = await deleteUser({ cookie, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(await userExists(id)).toBeFalse();
  });

  test("rejects a wrong password and keeps the user", async () => {
    const { id, cookie } = await signUp({ email: "delete-user@test.local" });

    const response = await deleteUser({ cookie, password: "wrong-password" });

    expect(response.status).toBe(400);
    expect(await userExists(id)).toBeTrue();
  });

  test("rejects deleting a user with API keys and keeps the user", async () => {
    const { id, cookie } = await signUp({ email: "delete-user@test.local" });
    await auth.api.createApiKey({ body: { userId: id, name: "Test" } });

    const response = await deleteUser({ cookie, password: PASSWORD });

    expect(response.status).toBe(403);
    expect(await userExists(id)).toBeTrue();
  });

  test("rejects deleting a member of an organization and keeps the user", async () => {
    const { id, cookie } = await signUp({ email: "delete-user@test.local" });
    await createOrganization(db, id);

    const response = await deleteUser({ cookie, password: PASSWORD });

    expect(response.status).toBe(403);
    expect(await userExists(id)).toBeTrue();
  });
});
