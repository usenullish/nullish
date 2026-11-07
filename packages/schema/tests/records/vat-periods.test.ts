import { describe, expect, test } from "bun:test";
import { InsertVatPeriodsSchema } from "../../src/records/schemas/core/vat";
import { VatPeriodStatus } from "../../src/db/constants/vat";

describe("InsertVatPeriodsSchema", () => {
  const dates = { startOn: new Date("2019-01-01"), endOn: new Date("2019-06-30") };

  test("accepts a period without a status", () => {
    expect(InsertVatPeriodsSchema.safeParse(dates).success).toBeTrue();
  });

  test.each(Object.values(VatPeriodStatus))("accepts the status %p", (status) => {
    expect(InsertVatPeriodsSchema.safeParse({ ...dates, status }).success).toBeTrue();
  });

  test("rejects an unknown status", () => {
    expect(InsertVatPeriodsSchema.safeParse({ ...dates, status: "archived" }).success).toBeFalse();
  });
});
