import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { DbMemberships } from "@usenullish/nullish-engine/core";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { buildCustomSession } from "../../src/server/_custom-session";

const USER_ID = "user-00000000-0000-4000-8000-000000000000";
const FIRST_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";

const db = {} as PostgresDbInstance;

const now = new Date();

const session = {
  user: {
    id: USER_ID,
    name: "Test",
    email: "test@test.dev",
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  },
  session: {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    userId: USER_ID,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  },
};

type ListAllResult = Awaited<ReturnType<DbMemberships["listAll"]>>;

const mockMemberships = (result: ListAllResult) =>
  spyOn(DbMemberships, "create").mockReturnValue({
    listAll: async () => result,
  } as unknown as DbMemberships);

const membership = ({ organizationId, role }: { organizationId: string; role: string }) => ({
  id: crypto.randomUUID(),
  userId: USER_ID,
  organizationId,
  role,
  createdAt: now,
  updatedAt: now,
});

describe("buildCustomSession", () => {
  afterEach(() => {
    spyOn(DbMemberships, "create").mockRestore();
  });

  test("reads the memberships as the user of the session", async () => {
    const create = mockMemberships({ status: "success", result: [] });

    await buildCustomSession({ db, session });

    expect(create).toHaveBeenCalledWith({ db, userId: USER_ID });
  });

  test("keeps the session and the user", async () => {
    mockMemberships({ status: "success", result: [] });

    const result = await buildCustomSession({ db, session });

    expect(result.session).toEqual(session.session);
    expect(result.user).toMatchObject(session.user);
  });

  test("returns no roles when the user is not a member of any organization", async () => {
    mockMemberships({ status: "success", result: [] });

    const result = await buildCustomSession({ db, session });

    expect(result.user).toMatchObject({ roles: [] });
  });

  test("returns the role and the organization of each membership", async () => {
    mockMemberships({
      status: "success",
      result: [
        membership({ organizationId: FIRST_ORGANIZATION_ID, role: "admin" }),
        membership({ organizationId: SECOND_ORGANIZATION_ID, role: "reviewer" }),
      ] as unknown as Extract<ListAllResult, { status: "success" }>["result"],
    });

    const result = await buildCustomSession({ db, session });

    expect(result.user).toMatchObject({
      ...session.user,
      roles: [
        { role: "admin", organizationId: FIRST_ORGANIZATION_ID },
        { role: "reviewer", organizationId: SECOND_ORGANIZATION_ID },
      ],
    });
  });

  test("returns the user without roles when the memberships cannot be read", async () => {
    mockMemberships({ status: "error", err: new Error("Failed") });

    const result = await buildCustomSession({ db, session });

    expect(result.user).toEqual(session.user);
    expect(result.user).not.toHaveProperty("roles");
  });
});
