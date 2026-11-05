import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getBaseCurrencyByOrgId, listCurrencies } from "../../src/_helpers/currencies";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("currencies helpers", () => {
  let orgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("getBaseCurrencyByOrgId", () => {
    test("returns the organization base currency and its decimals", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        getBaseCurrencyByOrgId({ tx, organizationId: orgId }),
      );

      expect(result).toEqual({ status: "success", result: { code: "CHF", decimals: 2 } });
    });
  });

  describe("listCurrencies", () => {
    test("returns the seeded default currencies", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) => listCurrencies({ tx }));

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const codes = result.result.map((currency) => currency.code);
      expect(codes).toContain("CHF");
      expect(codes).toContain("EUR");
      expect(codes).toContain("USD");

      const chf = result.result.find((currency) => currency.code === "CHF");
      expect(chf?.decimals).toBe(2);
    });
  });
});
