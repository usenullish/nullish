import { tryCatch, encodeWithCodecs } from "@usenullish/nullish-common";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { AuthSchema } from "@usenullish/nullish-schema/auth";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineDeleteRoute, defineGetRoute, definePostRoute } from "./_factories/crud-route-config";
import type { DefineOpenAPIHandler } from "../types/openapi";
import type { ApiEnv } from "../types/api";
import { errorResponse, toApiError } from "../_errors";

const route = {
  spec: { tag: "User" },
  path: "/user/api-keys",
} as const;

const listRoute = defineGetRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.UserApiKeys.GetApiKeysResponseSchema },
    description: "Lists the API keys of the signed-in user",
  },
});

const createRoute = definePostRoute({
  ...route,
  request: {
    body: { schema: ApiSchema.UserApiKeys.CreateApiKeyRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.UserApiKeys.CreateApiKeyResponseSchema },
    description: "Creates an API key for the signed-in user",
  },
});

const deleteRoute = defineDeleteRoute({
  ...route,
  request: {
    params: { schema: ApiSchema.UserApiKeys.ApiKeyParamsSchema },
  },
  response: {
    description: "Deletes an API key of the signed-in user",
  },
});

type ListRoute = typeof listRoute;
type CreateRoute = typeof createRoute;
type DeleteRoute = typeof deleteRoute;

type PluginApiKey = Pick<
  Awaited<ReturnType<ApiEnv["Variables"]["auth"]["api"]["listApiKeys"]>>["apiKeys"][number],
  "id" | "name" | "start" | "permissions" | "expiresAt" | "lastRequest" | "createdAt"
>;

@ResourceProvider
export class UserApiKeysHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): UserApiKeysHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#defineList });
    this.registerRoute({ route: createRoute, handler: this.#defineCreate });
    this.registerRoute({ route: deleteRoute, handler: this.#defineDelete });
  }

  #defineList: DefineOpenAPIHandler<ListRoute> = async (context) => {
    const {
      req: { raw },
      var: { auth, caller },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const result = await tryCatch(async () => {
      const { apiKeys } = await auth.api.listApiKeys({ headers: raw.headers });

      return encodeWithCodecs({
        schema: ApiSchema.UserApiKeys.GetApiKeysResponseSchema,
        value: {
          apiKeys: apiKeys.map(this.#toApiKey),
        },
      });
    });

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to list the API keys",
        }),
      });
    }

    return context.json(result.result, 200);
  };

  #defineCreate: DefineOpenAPIHandler<CreateRoute> = async (context) => {
    const {
      req,
      var: { auth, caller },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const { name, expiresInDays, permissions } = req.valid("json");

    const result = await tryCatch(async () => {
      const { key, ...apiKey } = await auth.api.createApiKey({
        body: {
          userId: caller.userId,
          name,
          expiresIn: expiresInDays * 24 * 60 * 60,
          permissions,
        },
      });

      return encodeWithCodecs({
        schema: ApiSchema.UserApiKeys.CreateApiKeyResponseSchema,
        value: {
          apiKey: this.#toApiKey(apiKey),
          key,
        },
      });
    });

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to create the API key",
        }),
      });
    }

    return context.json(result.result, 201);
  };

  #defineDelete: DefineOpenAPIHandler<DeleteRoute> = async (context) => {
    const {
      req,
      var: { auth, caller },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const id = req.param("id");

    const result = await tryCatch(() =>
      auth.api.deleteApiKey({
        body: { keyId: id },
        headers: req.raw.headers,
        asResponse: true,
      }),
    );

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to delete the API key",
        }),
      });
    }

    const { result: response } = result;

    if (response.status === 404) {
      return errorResponse({ context, error: "Not Found", code: ErrorCode.NOT_FOUND, status: 404 });
    }

    if (!response.ok) {
      console.error(await response.text());
      return errorResponse({
        context,
        error: "Failed to delete the API key",
        code: ErrorCode.UNEXPECTED,
        status: 500,
      });
    }

    return context.body(null, 204);
  };

  #toApiKey = ({
    id,
    name,
    start,
    permissions,
    expiresAt,
    lastRequest,
    createdAt,
  }: PluginApiKey) => ({
    id,
    name,
    start,
    permissions: AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema.nullable().parse(permissions),
    expiresAt,
    lastRequest,
    createdAt,
  });
}
