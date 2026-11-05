import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiCaller, ApiEnv } from "../../../src/api/types/api";
import { defineMcp } from "../../../src/api/resources/_mcp";

describe("mcp resource", () => {
  const request = async ({ caller }: { caller: ApiEnv["Variables"]["caller"] }) => {
    const app = new Hono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("caller", caller);
      context.set("db", { connection: {} as ApiEnv["Variables"]["db"]["connection"] });
      context.set("workers", {} as ApiEnv["Variables"]["workers"]);
      await next();
    });

    app.all("/mcp", defineMcp);

    return await app.request("/mcp", { method: "POST" });
  };

  const expectUnauthorized = async (response: Response) => {
    expect(response.status).toBe(401);

    const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  };

  test("answers 401 without a caller", async () => {
    await expectUnauthorized(await request({ caller: null }));
  });

  test("answers 401 to the caller of a session", async () => {
    await expectUnauthorized(
      await request({ caller: { type: "user", userId: "session-user" } as ApiCaller }),
    );
  });

  test("answers 401 to an api key with only the api permissions", async () => {
    await expectUnauthorized(
      await request({
        caller: {
          type: "api-key",
          userId: "api-key-owner",
          permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        },
      }),
    );
  });

  test("answers 401 to an api key with only the mcp write permission", async () => {
    await expectUnauthorized(
      await request({
        caller: {
          type: "api-key",
          userId: "api-key-owner",
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.WRITE] },
        },
      }),
    );
  });
});
