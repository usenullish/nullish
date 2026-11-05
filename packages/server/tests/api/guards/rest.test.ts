import { describe, expect, test } from "bun:test";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiCaller, ApiEnv } from "../../../src/api/types/api";
import { withRest } from "../../../src/api/guards/rest";

describe("rest guard", () => {
  const route = createRoute({
    method: "get",
    path: "/guarded",
    responses: { 200: { description: "Passed" } },
  });

  const request = async ({ caller }: { caller: ApiEnv["Variables"]["caller"] }) => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("caller", caller);
      await next();
    });

    app.openapi(
      route,
      withRest<typeof route>(async ({ context, caller }) =>
        context.json({ userId: caller.userId }),
      ),
    );

    return await app.request("/guarded");
  };

  const apiKey = ({
    permissions,
  }: {
    permissions: Extract<ApiCaller, { type: "api-key" }>["permissions"];
  }): ApiCaller => ({ type: "api-key", userId: "api-key-owner", permissions });

  const expectPassed = async ({ response, userId }: { response: Response; userId: string }) => {
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId });
  };

  const expectUnauthorized = async (response: Response) => {
    expect(response.status).toBe(401);

    const error = CommonSchema.Error.ErrorSchema.parse(await response.json());
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  };

  test("answers 401 without a caller", async () => {
    await expectUnauthorized(await request({ caller: null }));
  });

  test("passes the caller of a session to the handler", async () => {
    await expectPassed({
      response: await request({ caller: { type: "user", userId: "session-user" } as ApiCaller }),
      userId: "session-user",
    });
  });

  test("answers 401 to an api key with the mcp read permission", async () => {
    await expectUnauthorized(
      await request({
        caller: apiKey({ permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ] } }),
      }),
    );
  });

  test("answers 401 to an api key with the mcp read and write permissions", async () => {
    await expectUnauthorized(
      await request({
        caller: apiKey({
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        }),
      }),
    );
  });

  test("answers 401 to an api key with both the mcp and the api permissions", async () => {
    await expectUnauthorized(
      await request({
        caller: apiKey({
          permissions: {
            [ApiKeyResource.MCP]: [ApiKeyAction.READ],
            [ApiKeyResource.API]: [ApiKeyAction.READ],
          },
        }),
      }),
    );
  });

  test("passes an api key without the mcp permission to the handler", async () => {
    await expectPassed({
      response: await request({
        caller: apiKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] } }),
      }),
      userId: "api-key-owner",
    });
  });
});
