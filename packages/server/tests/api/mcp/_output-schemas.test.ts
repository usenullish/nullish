import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { BigIntCodec, DateCodec } from "@usenullish/nullish-common";
import { McpOutputSchemas } from "../../../src/api/mcp/_output-schemas";

const OutputSchema = z.strictObject({
  amount: BigIntCodec,
  validOn: DateCodec,
});

describe("McpOutputSchemas", () => {
  describe("create", () => {
    test("returns the same instance on repeated calls", () => {
      expect(McpOutputSchemas.create()).toBe(McpOutputSchemas.create());
    });
  });

  describe("encode", () => {
    test("returns the cached schema for the same output schema", () => {
      const outputSchemas = McpOutputSchemas.create();

      expect(outputSchemas.encode(OutputSchema)).toBe(outputSchemas.encode(OutputSchema));
    });

    test("shares the cache across instances returned by create", () => {
      expect(McpOutputSchemas.create().encode(OutputSchema)).toBe(
        McpOutputSchemas.create().encode(OutputSchema),
      );
    });

    test("returns a distinct schema for another output schema", () => {
      const outputSchemas = McpOutputSchemas.create();

      const OtherSchema = z.strictObject({ validOn: DateCodec });

      expect(outputSchemas.encode(OtherSchema)).not.toBe(outputSchemas.encode(OutputSchema));
    });

    test("produces a schema representable in JSON Schema on its output side", () => {
      const encoded = McpOutputSchemas.create().encode(OutputSchema);

      expect(() => z.toJSONSchema(encoded, { io: "output" })).not.toThrow();
    });

    test("accepts the encoded values wrapped in a result", () => {
      const encoded = McpOutputSchemas.create().encode(OutputSchema);

      const value = {
        result: {
          amount: { __bigint__: "1000" },
          validOn: { __date__: "2026-06-15" },
        },
      };

      expect(encoded.parse(value)).toEqual(value);
    });

    test("rejects the decoded values", () => {
      const encoded = McpOutputSchemas.create().encode(OutputSchema);

      const result = encoded.validate({
        result: {
          amount: 1000n,
          validOn: new Date("2026-06-15"),
        },
      });

      expect(result).toBeFalse();
    });

    test("rejects an output that is not wrapped in a result", () => {
      const encoded = McpOutputSchemas.create().encode(OutputSchema);

      const result = encoded.validate({
        amount: { __bigint__: "1000" },
        validOn: { __date__: "2026-06-15" },
      });

      expect(result).toBeFalse();
    });
  });
});
