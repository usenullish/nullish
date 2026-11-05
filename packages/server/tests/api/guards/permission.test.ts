import { describe, expect, test } from "bun:test";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiCaller, ApiEnv } from "../../../src/api/types/api";
import { withCaller } from "../../../src/api/guards/caller";
import { withPermission } from "../../../src/api/guards/permission";

describe("permission guard", () => {
  const METHODS = ["get", "post", "patch", "delete"] as const;

  type Method = (typeof METHODS)[number];

  const request = async ({
    caller,
    method,
  }: {
    caller: ApiEnv["Variables"]["caller"];
    method: Method;
  }) => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set("caller", caller);
      await next();
    });

    METHODS.forEach((routeMethod) => {
      const route = createRoute({
        method: routeMethod,
        path: "/guarded",
        responses: { 200: { description: "Passed" } },
      });

      app.openapi(
        route,
        withCaller<typeof route>(
          withPermission<typeof route>(async ({ context, caller }) =>
            context.json({ userId: caller.userId }),
          ),
        ),
      );
    });

    return await app.request("/guarded", { method: method.toUpperCase() });
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
    await expectUnauthorized(await request({ caller: null, method: "get" }));
  });

  test.each(METHODS.map((method) => [method]))(
    "passes the caller of a session to the handler of a %s",
    async (method) => {
      await expectPassed({
        response: await request({
          caller: { type: "user", userId: "session-user" } as ApiCaller,
          method,
        }),
        userId: "session-user",
      });
    },
  );

  test.each(METHODS.map((method) => [method]))(
    "passes an api key with the api read and write permissions to the handler of a %s",
    async (method) => {
      await expectPassed({
        response: await request({
          caller: apiKey({
            permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
          }),
          method,
        }),
        userId: "api-key-owner",
      });
    },
  );

  test("passes an api key with the api read permission to the handler of a get", async () => {
    await expectPassed({
      response: await request({
        caller: apiKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] } }),
        method: "get",
      }),
      userId: "api-key-owner",
    });
  });

  test.each(["post", "patch", "delete"] as const)(
    "answers 401 to an api key with only the api read permission for a %s",
    async (method) => {
      await expectUnauthorized(
        await request({
          caller: apiKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ] } }),
          method,
        }),
      );
    },
  );

  test("answers 401 to an api key with only the api write permission for a get", async () => {
    await expectUnauthorized(
      await request({
        caller: apiKey({ permissions: { [ApiKeyResource.API]: [ApiKeyAction.WRITE] } }),
        method: "get",
      }),
    );
  });

  test("answers 401 to an api key with only the mcp permissions", async () => {
    await expectUnauthorized(
      await request({
        caller: apiKey({
          permissions: { [ApiKeyResource.MCP]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        }),
        method: "get",
      }),
    );
  });

  test("answers 401 to an api key with the api read and write permissions for an options", async () => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", async (context, next) => {
      context.set(
        "caller",
        apiKey({
          permissions: { [ApiKeyResource.API]: [ApiKeyAction.READ, ApiKeyAction.WRITE] },
        }),
      );
      await next();
    });

    const route = createRoute({
      method: "options",
      path: "/guarded",
      responses: { 200: { description: "Passed" } },
    });

    app.openapi(
      route,
      withCaller<typeof route>(
        withPermission<typeof route>(async ({ context, caller }) =>
          context.json({ userId: caller.userId }),
        ),
      ),
    );

    await expectUnauthorized(await app.request("/guarded", { method: "OPTIONS" }));
  });

  test("answers 401 to an api key without any permission", async () => {
    await expectUnauthorized(await request({ caller: apiKey({ permissions: {} }), method: "get" }));
  });
});
