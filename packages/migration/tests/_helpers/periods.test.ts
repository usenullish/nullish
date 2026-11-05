import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { getOpenPeriod, listPeriodsByOrgId } from "../../src/_helpers/periods";
import {
  createOrganization,
  createPeriod,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("periods helpers", () => {
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      createPeriod({
        tx,
        organizationId: orgId,
        startOn: new Date(Date.UTC(2026, 0, 1)),
        endOn: new Date(Date.UTC(2026, 11, 31)),
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("getOpenPeriod", () => {
    test("returns the open period starting on or before the given date", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getOpenPeriod({
          tx,
          organizationId: orgId,
          validOn: new Date(Date.UTC(2026, 5, 1)),
        }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.endOn).toEqual(new Date(Date.UTC(2026, 11, 31)));
      expect(result.result.status).toBe(PeriodStatus.OPEN);
    });

    test("errors when the open period starts after the given date", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getOpenPeriod({
          tx,
          organizationId: orgId,
          validOn: new Date(Date.UTC(2025, 11, 31)),
        }),
      );

      expect(result.status).toBe("error");
    });

    test("errors for another organization's periods", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getOpenPeriod({
          tx,
          organizationId: otherOrgId,
          validOn: new Date(Date.UTC(2026, 5, 1)),
        }),
      );

      expect(result.status).toBe("error");
    });
  });

  describe("listPeriodsByOrgId", () => {
    test("returns the periods of the organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listPeriodsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ startOn, endOn }) => ({ startOn, endOn }))).toEqual([
        { startOn: new Date(Date.UTC(2026, 0, 1)), endOn: new Date(Date.UTC(2026, 11, 31)) },
      ]);
    });

    test("returns no period of another organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listPeriodsByOrgId({ tx, organizationId: otherOrgId }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
