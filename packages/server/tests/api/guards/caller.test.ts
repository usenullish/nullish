import { describe, expect, test } from "bun:test";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiCaller, ApiEnv } from "../../../src/api/types/api";
import { withCaller } from "../../../src/api/guards/caller";

describe("caller guard", () => {
  const route = createRoute({
    method: "get",
    path: "/guarded",
    responses: { 200: { description: "Passed" } },
  });

  const request = async ({
    caller,
    guard,
  }: {
    caller: ApiEnv["Variables"]["caller"];
    guard: typeof withCaller;
  }) => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("caller", caller);
      await next();
    });

    app.openapi(
      route,
      guard<typeof route>(async ({ context, caller }) => context.json({ userId: caller.userId })),
    );

    return await app.request("/guarded");
  };

  const apiKey = ({
    permissions,
  }: {
    permissions: Extract<ApiCaller, { type: "api-key" }>["permissions"];
  }): ApiCaller => ({ type: "api-key", userId: "api-key-owner", permissions });

  const expectUnauthorized = async (response: Response) => {
    expect(response.status).toBe(401);

    const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  };

  describe("withCaller", () => {
    test("answers 401 without a caller", async () => {
      await expectUnauthorized(await request({ caller: null, guard: withCaller }));
    });

    test("answers 401 with an undefined caller", async () => {
      await expectUnauthorized(await request({ caller: undefined, guard: withCaller }));
    });

    test("passes the caller of a session to the handler", async () => {
      const response = await request({
        caller: { type: "user", userId: "session-user" } as ApiCaller,
        guard: withCaller,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: "session-user" });
    });

    test("passes an api key with the mcp permission to the handler", async () => {
      const response = await request({
        caller: apiKey({ permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] } }),
        guard: withCaller,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: "api-key-owner" });
    });
  });
});
