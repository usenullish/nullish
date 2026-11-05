import { describe, expect, test } from "bun:test";
import { EngineError } from "@usenullish/nullish-engine";
import * as z from "zod";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import { toApiError } from "../../src/api/_errors";

const FALLBACK = "Failed to create client";

describe("toApiError", () => {
  test("exposes the message of an engine error as rejected", () => {
    const err = new EngineError("The invoice has no lines.");

    expect(toApiError({ err, fallback: FALLBACK })).toEqual({
      status: 422,
      code: ErrorCode.REJECTED,
      error: "The invoice has no lines.",
    });
  });

  test("hides an engine error without a message behind the fallback", () => {
    expect(toApiError({ err: new EngineError(), fallback: FALLBACK })).toEqual({
      status: 500,
      code: ErrorCode.UNEXPECTED,
      error: FALLBACK,
    });
  });

  test("exposes the message of a rule violation raised by the database as rejected", () => {
    const err = new Error("Failed query", {
      cause: { errno: "R0001", message: "No period covers date 2026-03-01" },
    });

    expect(toApiError({ err, fallback: FALLBACK })).toEqual({
      status: 422,
      code: ErrorCode.REJECTED,
      error: "No period covers date 2026-03-01",
    });
  });

  test("exposes the message of a rule violation raised when the transaction commits", () => {
    const err = Object.assign(new Error("The journal entry does not balance"), { errno: "R0001" });

    expect(toApiError({ err, fallback: FALLBACK })).toEqual({
      status: 422,
      code: ErrorCode.REJECTED,
      error: "The journal entry does not balance",
    });
  });

  test("reports a version conflict", () => {
    const err = new Error("Failed query", { cause: { errno: "40001" } });

    expect(toApiError({ err, fallback: FALLBACK })).toMatchObject({
      status: 409,
      code: ErrorCode.CONFLICT,
    });
  });

  test("reports the issues of a validation error", () => {
    const { error: err } = z.strictObject({ name: z.string() }).safeParse({});

    const errorResponse = toApiError({ err, fallback: FALLBACK });

    expect(errorResponse).toMatchObject({ status: 400, code: ErrorCode.VALIDATION });
    expect(errorResponse.error).toContain("name");
  });

  test("hides any other error behind the fallback", () => {
    const err = new Error("relation does not exist", { cause: { errno: "42P01" } });

    expect(toApiError({ err, fallback: FALLBACK })).toEqual({
      status: 500,
      code: ErrorCode.UNEXPECTED,
      error: FALLBACK,
    });
  });
});
