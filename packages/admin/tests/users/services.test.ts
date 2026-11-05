import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { assertNonNullish } from "@usenullish/nullish-common";
import { listUsersWithOrgs } from "../../src/users/helpers";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
} from "../_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("listUsersWithOrgs", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("returns one row for every user", async () => {
    const result = await withUser(db, TEST_USER_ID, (tx) => listUsersWithOrgs(tx));

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.map((row) => row.userId).sort()).toEqual(
      [TEST_USER_ID, TEST_OTHER_USER_ID].sort(),
    );
  });

  test("joins the organization and admin role for a member", async () => {
    const result = await withUser(db, TEST_USER_ID, (tx) => listUsersWithOrgs(tx));

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const row = result.result.find((entry) => entry.userId === TEST_USER_ID);
    assertNonNullish(row);

    expect(row.email).toBe(`${TEST_USER_ID}@test.dev`);
    expect(row.organizationName).toBe(`Org ${TEST_USER_ID}`);
    expect(row.role).toBe("admin");
    expect(row.organizationId).not.toBeNull();
  });

  test("leaves the organization fields null for a user without a membership", async () => {
    const result = await withUser(db, TEST_USER_ID, (tx) => listUsersWithOrgs(tx));

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const row = result.result.find((entry) => entry.userId === TEST_OTHER_USER_ID);
    assertNonNullish(row);

    expect(row.organizationId).toBeNull();
    expect(row.organizationName).toBeNull();
    expect(row.role).toBeNull();
  });
});
