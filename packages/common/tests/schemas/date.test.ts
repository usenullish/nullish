import * as z from "zod";
import { describe, expect, it } from "bun:test";
import { DateStringCodec } from "../../src/schemas/date";

describe("date", () => {
  describe("DateStringCodec", () => {
    it("decodes a year-month-date string to a date", () => {
      expect(DateStringCodec.parse("2026-06-15")).toEqual(new Date("2026-06-15"));
    });

    it("encodes a date to a year-month-date string", () => {
      expect(z.encode(DateStringCodec, new Date("2026-06-15"))).toBe("2026-06-15");
    });

    it("round-trips a date", () => {
      const date = new Date("2026-12-31");

      expect(DateStringCodec.parse(z.encode(DateStringCodec, date))).toEqual(date);
    });

    it("rejects a string that is not a year-month-date", () => {
      expect(DateStringCodec.validate("15.06.2026")).toBeFalse();
    });

    it("rejects a date time", () => {
      expect(DateStringCodec.validate("2026-06-15T10:00:00Z")).toBeFalse();
    });

    it("rejects an impossible date", () => {
      expect(DateStringCodec.validate("2026-02-30")).toBeFalse();
    });
  });
});
