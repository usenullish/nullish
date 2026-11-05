import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { decodeWithCodecs, encodeWithCodecs } from "../../src/schemas/codecs";
import { BigIntCodec } from "../../src/schemas/bigint";
import { DateCodec } from "../../src/schemas/date";

const EntrySchema = z.strictObject({
  reference: z.string(),
  validOn: DateCodec,
  amount: BigIntCodec,
  dueOn: DateCodec.optional(),
});

describe("encodeWithCodecs", () => {
  test("encodes the dates and amounts with their codecs", () => {
    expect(
      encodeWithCodecs({
        schema: EntrySchema,
        value: { reference: "A-1", validOn: new Date("2026-01-15"), amount: 1250n },
      }),
    ).toEqual({
      reference: "A-1",
      validOn: { __date__: "2026-01-15" },
      amount: { __bigint__: "1250" },
    });
  });

  test("gives a value that survives JSON.stringify and JSON.parse", () => {
    const encoded = encodeWithCodecs({
      schema: EntrySchema,
      value: { reference: "A-1", validOn: new Date("2026-01-15"), amount: 1250n },
    });

    expect(JSON.parse(JSON.stringify(encoded))).toEqual(encoded);
  });

  test("throws when the value does not match the schema", () => {
    expect(() =>
      encodeWithCodecs({
        schema: EntrySchema,
        value: { reference: 1, validOn: new Date("2026-01-15"), amount: 1250n } as never,
      }),
    ).toThrow();
  });
});

describe("decodeWithCodecs", () => {
  test("decodes the dates and amounts with their codecs", () => {
    expect(
      decodeWithCodecs({
        schema: EntrySchema,
        value: {
          reference: "A-1",
          validOn: { __date__: "2026-01-15" },
          amount: { __bigint__: "1250" },
        },
      }),
    ).toEqual({ reference: "A-1", validOn: new Date("2026-01-15"), amount: 1250n });
  });

  test("gives back the encoded value", () => {
    const value = {
      reference: "A-1",
      validOn: new Date("2026-01-15"),
      amount: 1250n,
      dueOn: new Date("2026-02-14"),
    };

    expect(
      decodeWithCodecs({
        schema: EntrySchema,
        value: encodeWithCodecs({ schema: EntrySchema, value }),
      }),
    ).toEqual(value);
  });

  test("throws when the value does not match the schema", () => {
    expect(() =>
      decodeWithCodecs({
        schema: EntrySchema,
        value: { reference: "A-1", validOn: "2026-01-15", amount: { __bigint__: "1250" } } as never,
      }),
    ).toThrow();
  });
});
